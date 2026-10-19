from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import gymnasium as gym
import numpy as np
from gymnasium import spaces
from numpy.typing import NDArray


class DisruptionRiskPredictor(Protocol):
    def predict_proba(self, features: NDArray[np.float32]) -> NDArray[np.float64]: ...


@dataclass
class _Order:
    order_id: int
    shipment_id: int
    product_family: int
    remaining_work: float
    due_time: int
    disruption_risk: float
    buffer_minutes: float = 0.0
    split_used: bool = False


class GarmentProductionEnv(gym.Env[NDArray[np.float32], int]):
    """A finite-horizon, three-line garment dispatching MDP.

    Observations contain per-line queue lengths, machine availability, worker
    efficiency, mean remaining lead time, and predicted disruption risk,
    followed by active-order workload, due-time slack, risk, and buffer.
    Actions are maintain (0), reallocate the active order to Line B (1), inject
    a safety buffer (2), and split the active batch (3).
    """

    metadata = {"render_modes": ["human"]}

    LINE_NAMES = ("Line A", "Line B", "Line C")
    ACTION_MAINTAIN = 0
    ACTION_REALLOCATE_TO_LINE_B = 1
    ACTION_INJECT_BUFFER = 2
    ACTION_SPLIT_BATCH = 3
    MINUTES_PER_STEP = 10
    FEATURES_PER_LINE = 5
    ACTIVE_ORDER_FEATURES = 4

    def __init__(
        self,
        *,
        orders_per_episode: int = 12,
        max_episode_steps: int = 240,
        disruption_risk_predictor: DisruptionRiskPredictor | None = None,
        disruption_risk_model_path: str | Path | None = None,
        render_mode: str | None = None,
        changeover_penalty: float = 1.5,
        idle_machine_penalty: float = 0.4,
        late_shipment_penalty_per_minute: float = 0.1,
        on_time_delivery_reward: float = 10.0,
        disruption_penalty: float = 2.0,
        split_changeover_penalty: float = 1.0,
    ) -> None:
        super().__init__()
        if orders_per_episode < 1:
            raise ValueError("orders_per_episode must be at least 1")
        if max_episode_steps < 1:
            raise ValueError("max_episode_steps must be at least 1")
        if disruption_risk_predictor is not None and disruption_risk_model_path is not None:
            raise ValueError(
                "Provide either a disruption-risk predictor or a model path, not both"
            )
        if render_mode not in (None, "human"):
            raise ValueError(f"Unsupported render mode: {render_mode}")

        self.orders_per_episode = orders_per_episode
        self.max_episode_steps = max_episode_steps
        self.render_mode = render_mode
        self.changeover_penalty = changeover_penalty
        self.idle_machine_penalty = idle_machine_penalty
        self.late_shipment_penalty_per_minute = late_shipment_penalty_per_minute
        self.on_time_delivery_reward = on_time_delivery_reward
        self.disruption_penalty = disruption_penalty
        self.split_changeover_penalty = split_changeover_penalty
        self._risk_predictor = disruption_risk_predictor
        if disruption_risk_model_path is not None:
            self._risk_predictor = self._load_risk_predictor(
                disruption_risk_model_path
            )

        self.action_space = spaces.Discrete(4)
        self.observation_space = spaces.Box(
            low=0.0,
            high=1.0,
            shape=(
                len(self.LINE_NAMES) * self.FEATURES_PER_LINE
                + self.ACTIVE_ORDER_FEATURES,
            ),
            dtype=np.float32,
        )
        self._queues: list[deque[_Order]] = []
        self._machine_down_steps = np.zeros(len(self.LINE_NAMES), dtype=np.int32)
        self._worker_efficiencies = np.ones(len(self.LINE_NAMES), dtype=np.float32)
        self._last_product_families: list[int | None] = []
        self._current_time = 0
        self._steps = 0
        self._completed_orders = 0
        self._on_time_orders = 0
        self._total_changeovers = 0
        self._total_splits = 0
        self._shipment_batch_counts: dict[int, int] = {}
        self._active_order: _Order | None = None

    @staticmethod
    def _load_risk_predictor(model_path: str | Path) -> DisruptionRiskPredictor:
        path = Path(model_path)
        if not path.is_file():
            raise FileNotFoundError(f"Disruption risk model not found: {path}")
        try:
            import joblib
        except ImportError as exc:
            raise RuntimeError(
                "Loading a risk model requires joblib; install backend requirements"
            ) from exc
        predictor = joblib.load(path)
        if not callable(getattr(predictor, "predict_proba", None)) and not callable(
            getattr(predictor, "predict", None)
        ):
            raise TypeError(
                "Disruption risk model must implement predict_proba or predict"
            )
        return predictor

    def reset(
        self,
        *,
        seed: int | None = None,
        options: dict[str, Any] | None = None,
    ) -> tuple[NDArray[np.float32], dict[str, Any]]:
        super().reset(seed=seed)
        if options and "orders" in options:
            orders = self._validate_orders(options["orders"])
        else:
            orders = self._generate_orders()

        self._queues = [deque() for _ in self.LINE_NAMES]
        self._machine_down_steps = np.zeros(len(self.LINE_NAMES), dtype=np.int32)
        self._worker_efficiencies = self.np_random.uniform(
            0.72, 1.0, size=len(self.LINE_NAMES)
        ).astype(np.float32)
        self._last_product_families = [None] * len(self.LINE_NAMES)
        self._current_time = 0
        self._steps = 0
        self._completed_orders = 0
        self._on_time_orders = 0
        self._total_changeovers = 0
        self._total_splits = 0
        self._shipment_batch_counts = {}
        self._active_order = None

        for index, order in enumerate(orders):
            line = index % len(self.LINE_NAMES)
            self._queues[line].append(order)
            self._shipment_batch_counts[order.shipment_id] = (
                self._shipment_batch_counts.get(order.shipment_id, 0) + 1
            )
        self._next_order_id = max(order.order_id for order in orders) + 1
        self._select_active_order()
        return self._observation(), self._info()

    def step(
        self, action: int
    ) -> tuple[NDArray[np.float32], float, bool, bool, dict[str, Any]]:
        if not self.action_space.contains(action):
            raise ValueError(f"Invalid action {action}; expected an integer from 0 to 3")
        if self._active_order is None:
            raise RuntimeError("Call reset() before stepping a completed environment")

        self._steps += 1
        reward = 0.0
        action = int(action)
        order = self._active_order
        line_index = self._line_for_order(order)
        if action == self.ACTION_REALLOCATE_TO_LINE_B:
            target_line = self.LINE_NAMES.index("Line B")
            if line_index != target_line:
                self._remove_order(order, line_index)
                self._queues[target_line].appendleft(order)
                line_index = target_line
                if self._last_product_families[line_index] not in (
                    None,
                    order.product_family,
                ):
                    reward -= self.changeover_penalty
                    self._total_changeovers += 1
                self._last_product_families[line_index] = order.product_family

        if action == self.ACTION_INJECT_BUFFER:
            order.buffer_minutes += self.MINUTES_PER_STEP
            self._current_time += self.MINUTES_PER_STEP
            reward -= self.idle_machine_penalty
            order.disruption_risk *= 0.75
        else:
            split_this_step = (
                action == self.ACTION_SPLIT_BATCH
                and not order.split_used
                and order.remaining_work > 1
            )
            if split_this_step:
                order.split_used = True
                split_work = order.remaining_work * 0.25
                order.remaining_work -= split_work
                self._split_active_batch(order, line_index, split_work)
                reward -= self.split_changeover_penalty
                self._total_splits += 1

            if self._machine_down_steps[line_index] > 0:
                self._current_time += self.MINUTES_PER_STEP
                reward -= self.idle_machine_penalty
            else:
                risk = self._predicted_line_risks()[line_index]
                if self.np_random.random() < risk:
                    self._machine_down_steps[line_index] = int(
                        self.np_random.integers(2, 5)
                    )
                    self._current_time += self.MINUTES_PER_STEP
                    reward -= self.disruption_penalty
                else:
                    efficiency = float(self._worker_efficiencies[line_index])
                    work_rate = efficiency
                    if split_this_step:
                        work_rate *= 1.5
                    worked = min(order.remaining_work, work_rate)
                    order.remaining_work -= worked
                    self._current_time += self.MINUTES_PER_STEP
                    reward += worked
                    order.disruption_risk *= max(0.5, 1 - worked * 0.04)
                    self._worker_efficiencies[line_index] = np.float32(
                        np.clip(
                            self._worker_efficiencies[line_index]
                            + self.np_random.normal(0, 0.015),
                            0.5,
                            1.0,
                        )
                    )
                    if order.remaining_work <= 0:
                        if self._complete_order(order, line_index):
                            lateness = max(0, self._current_time - order.due_time)
                            if lateness == 0:
                                reward += self.on_time_delivery_reward
                                self._on_time_orders += 1
                            else:
                                reward -= (
                                    lateness * self.late_shipment_penalty_per_minute
                                )

        self._advance_machines()
        reward -= self._select_active_order()
        terminated = self._active_order is None
        truncated = self._steps >= self.max_episode_steps and not terminated
        if truncated:
            reward -= self._unfinished_order_penalty()
        return self._observation(), float(reward), terminated, truncated, self._info()

    def render(self) -> str | None:
        if self.render_mode != "human":
            return None
        summary = (
            f"time={self._current_time} min; "
            f"queues={[len(queue) for queue in self._queues]}; "
            f"active_order={self._active_order.order_id if self._active_order else None}"
        )
        print(summary)
        return summary

    def close(self) -> None:
        return None

    def _generate_orders(self) -> list[_Order]:
        orders = []
        for order_id in range(self.orders_per_episode):
            work = float(self.np_random.uniform(4, 12))
            orders.append(
                _Order(
                    order_id=order_id,
                    shipment_id=order_id,
                    product_family=int(self.np_random.integers(0, 4)),
                    remaining_work=work,
                    due_time=int(
                        self.np_random.integers(
                            self.MINUTES_PER_STEP * 4,
                            self.MINUTES_PER_STEP * 18,
                        )
                    ),
                    disruption_risk=float(self.np_random.uniform(0.01, 0.35)),
                )
            )
        return orders

    @staticmethod
    def _validate_orders(orders: Any) -> list[_Order]:
        if not isinstance(orders, list) or not orders:
            raise ValueError("options['orders'] must be a non-empty list")
        validated = []
        for index, order in enumerate(orders):
            if not isinstance(order, dict):
                raise ValueError(f"Order {index} must be a dictionary")
            try:
                remaining_work = float(order["remaining_work"])
                due_time = int(order["due_time"])
                product_family = int(order.get("product_family", 0))
                risk = float(order["disruption_risk"])
            except (KeyError, TypeError, ValueError) as exc:
                raise ValueError(
                    f"Order {index} needs numeric remaining_work, due_time, "
                    "and disruption_risk fields"
                ) from exc
            if remaining_work <= 0 or due_time < 0 or not 0 <= risk <= 1:
                raise ValueError(
                    f"Order {index} must have positive remaining_work, "
                    "non-negative due_time, and disruption_risk between 0 and 1"
                )
            validated.append(
                _Order(
                    order_id=int(order.get("order_id", index)),
                    shipment_id=int(
                        order.get("shipment_id", order.get("order_id", index))
                    ),
                    product_family=product_family,
                    remaining_work=remaining_work,
                    due_time=due_time,
                    disruption_risk=risk,
                )
            )
        order_ids = [order.order_id for order in validated]
        if len(set(order_ids)) != len(order_ids):
            raise ValueError("Order IDs must be unique within an episode")
        return validated

    def _select_active_order(self) -> float:
        queued = [
            (order.due_time, order.order_id, line_index, order)
            for line_index, queue in enumerate(self._queues)
            for order in queue
        ]
        if not queued:
            self._active_order = None
            return 0.0
        _, _, line_index, order = min(queued)
        if self._active_order is not order:
            self._active_order = order
            previous_family = self._last_product_families[line_index]
            if previous_family is not None and previous_family != order.product_family:
                self._last_product_families[line_index] = order.product_family
                self._total_changeovers += 1
                return self.changeover_penalty
            self._last_product_families[line_index] = order.product_family
        return 0.0

    def _line_for_order(self, order: _Order) -> int:
        for index, queue in enumerate(self._queues):
            if order in queue:
                return index
        raise RuntimeError(f"Active order {order.order_id} is not queued")

    def _remove_order(self, order: _Order, line_index: int) -> None:
        self._queues[line_index].remove(order)

    def _complete_order(self, order: _Order, line_index: int) -> bool:
        self._queues[line_index].remove(order)
        self._last_product_families[line_index] = order.product_family
        remaining_batches = self._shipment_batch_counts[order.shipment_id] - 1
        if remaining_batches:
            self._shipment_batch_counts[order.shipment_id] = remaining_batches
            return False
        del self._shipment_batch_counts[order.shipment_id]
        self._completed_orders += 1
        return True

    def _split_active_batch(
        self, order: _Order, source_line: int, split_work: float
    ) -> None:
        target_line = min(
            (
                index
                for index in range(len(self.LINE_NAMES))
                if index != source_line
            ),
            key=lambda index: len(self._queues[index]),
        )
        split_batch = _Order(
            order_id=self._next_order_id,
            shipment_id=order.shipment_id,
            product_family=order.product_family,
            remaining_work=split_work,
            due_time=order.due_time,
            disruption_risk=order.disruption_risk,
            buffer_minutes=order.buffer_minutes,
        )
        self._next_order_id += 1
        self._shipment_batch_counts[order.shipment_id] += 1
        self._queues[target_line].appendleft(split_batch)

    def _advance_machines(self) -> None:
        self._machine_down_steps = np.maximum(0, self._machine_down_steps - 1)

    def _unfinished_order_penalty(self) -> float:
        penalty = 0.0
        shipments = {
            order.shipment_id: order
            for queue in self._queues
            for order in queue
        }
        for order in shipments.values():
            lateness = max(0, self._current_time - order.due_time)
            penalty += self.late_shipment_penalty_per_minute * (
                lateness + self.MINUTES_PER_STEP
            )
        return penalty

    def _predicted_line_risks(self) -> NDArray[np.float64]:
        features = np.asarray(
            [
                [
                    min(1.0, len(self._queues[index]) / self.orders_per_episode),
                    float(self._machine_down_steps[index] == 0),
                    float(self._worker_efficiencies[index]),
                    self._mean_lead_time_slack(index),
                    self._mean_order_risk(index),
                ]
                for index in range(len(self.LINE_NAMES))
            ],
            dtype=np.float32,
        )
        if self._risk_predictor is None:
            queue_pressure = features[:, 0]
            low_efficiency = 1 - features[:, 2]
            risk = np.clip(
                features[:, 4] + 0.12 * queue_pressure + 0.2 * low_efficiency,
                0,
                0.95,
            )
            return risk.astype(np.float64)

        predict_proba = getattr(self._risk_predictor, "predict_proba", None)
        predictions = (
            np.asarray(predict_proba(features))
            if callable(predict_proba)
            else np.asarray(self._risk_predictor.predict(features))
        )
        if predictions.ndim == 2:
            predictions = predictions[:, -1]
        if predictions.shape != (len(self.LINE_NAMES),):
            raise ValueError(
                "Disruption risk predictor must return one probability per input line"
            )
        if not np.isfinite(predictions).all() or np.any(
            (predictions < 0) | (predictions > 1)
        ):
            raise ValueError("Disruption risk predictions must be finite probabilities")
        return predictions.astype(np.float64)

    def _mean_lead_time_slack(self, line_index: int) -> float:
        queue = self._queues[line_index]
        if not queue:
            return 0.5
        mean_slack = sum(
            max(0, order.due_time - self._current_time) for order in queue
        ) / len(queue)
        return float(np.clip(mean_slack / (self.MINUTES_PER_STEP * 20), 0, 1))

    def _mean_order_risk(self, line_index: int) -> float:
        queue = self._queues[line_index]
        if not queue:
            return 0.0
        return float(sum(order.disruption_risk for order in queue) / len(queue))

    def _observation(self) -> NDArray[np.float32]:
        predicted_risks = self._predicted_line_risks()
        features: list[float] = []
        for line_index, queue in enumerate(self._queues):
            features.extend(
                (
                    min(1.0, len(queue) / self.orders_per_episode),
                    float(self._machine_down_steps[line_index] == 0),
                    float(self._worker_efficiencies[line_index]),
                    self._mean_lead_time_slack(line_index),
                    float(predicted_risks[line_index]),
                )
            )
        if self._active_order is None:
            features.extend((0.0, 0.5, 0.0, 0.0))
        else:
            order = self._active_order
            line_index = self._line_for_order(order)
            features.extend(
                (
                    min(1.0, order.remaining_work / 20),
                    float(
                        np.clip(
                            (order.due_time - self._current_time)
                            / (self.MINUTES_PER_STEP * 20),
                            0,
                            1,
                        )
                    ),
                    float(predicted_risks[line_index]),
                    min(1.0, order.buffer_minutes / (self.MINUTES_PER_STEP * 5)),
                )
            )
        return np.asarray(features, dtype=np.float32)

    def _info(self) -> dict[str, Any]:
        return {
            "time_minutes": self._current_time,
            "completed_orders": self._completed_orders,
            "on_time_orders": self._on_time_orders,
            "changeovers": self._total_changeovers,
            "split_batches": self._total_splits,
            "queue_lengths": {
                line: len(self._queues[index])
                for index, line in enumerate(self.LINE_NAMES)
            },
        }
