import numpy as np
import pytest

from app.rl.garment_env import GarmentProductionEnv


class FixedRiskPredictor:
    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        assert features.shape == (3, 5)
        return np.tile([0.8, 0.2], (3, 1))


class NoRiskPredictor:
    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        return np.tile([1.0, 0.0], (3, 1))


def make_env(**kwargs: object) -> GarmentProductionEnv:
    kwargs.setdefault("orders_per_episode", 2)
    kwargs.setdefault("max_episode_steps", 100)
    return GarmentProductionEnv(
        **kwargs,
    )


def test_reset_and_step_follow_gymnasium_spaces_and_return_contract():
    env = make_env()
    observation, info = env.reset(seed=7)

    assert env.observation_space.contains(observation)
    assert observation.shape == (19,)
    assert set(info["queue_lengths"]) == set(env.LINE_NAMES)
    next_observation, reward, terminated, truncated, next_info = env.step(0)
    assert env.observation_space.contains(next_observation)
    assert isinstance(reward, float)
    assert terminated is False
    assert truncated is False
    assert next_info["time_minutes"] == env.MINUTES_PER_STEP


def test_custom_orders_can_complete_with_on_time_delivery_reward():
    env = make_env(orders_per_episode=1)
    observation, _ = env.reset(
        seed=1,
        options={
            "orders": [
                {
                    "order_id": 1,
                    "remaining_work": 0.1,
                    "due_time": 100,
                    "disruption_risk": 0,
                }
            ]
        },
    )
    assert env.observation_space.contains(observation)

    _, reward, terminated, truncated, info = env.step(0)

    assert terminated is True
    assert truncated is False
    assert reward > env.on_time_delivery_reward
    assert info["completed_orders"] == 1
    assert info["on_time_orders"] == 1


def test_reallocation_targets_line_b_and_counts_style_changeover():
    env = make_env(orders_per_episode=1)
    env.reset(
        seed=2,
        options={
            "orders": [
                {
                    "order_id": 1,
                    "product_family": 1,
                    "remaining_work": 20,
                    "due_time": 1000,
                    "disruption_risk": 0,
                },
                {
                    "order_id": 2,
                    "product_family": 2,
                    "remaining_work": 20,
                    "due_time": 1100,
                    "disruption_risk": 0,
                },
            ]
        },
    )
    env._last_product_families[1] = 0

    _, reward, _, _, info = env.step(env.ACTION_REALLOCATE_TO_LINE_B)

    assert reward < 0
    assert info["changeovers"] == 1
    assert info["queue_lengths"]["Line B"] == 2


def test_buffer_and_batch_split_actions_apply_documented_costs():
    buffer_env = make_env(orders_per_episode=1)
    buffer_env.reset(
        seed=3,
        options={
            "orders": [
                {
                    "remaining_work": 20,
                    "due_time": 1000,
                    "disruption_risk": 0,
                }
            ]
        },
    )
    _, buffer_reward, _, _, _ = buffer_env.step(
        buffer_env.ACTION_INJECT_BUFFER
    )
    assert buffer_reward == -buffer_env.idle_machine_penalty

    split_env = make_env(
        orders_per_episode=1,
        disruption_risk_predictor=NoRiskPredictor(),
    )
    initial_observation, _ = split_env.reset(
        seed=4,
        options={
            "orders": [
                {
                    "remaining_work": 20,
                    "due_time": 1000,
                    "disruption_risk": 0,
                }
            ]
        },
    )
    _, split_reward, _, _, info = split_env.step(split_env.ACTION_SPLIT_BATCH)
    assert split_env.observation_space.contains(initial_observation)
    assert split_reward > -split_env.split_changeover_penalty
    assert info["changeovers"] == 0
    assert info["split_batches"] == 1
    batches = [
        order
        for queue in split_env._queues
        for order in queue
    ]
    assert len(batches) == 2
    assert sum(order.remaining_work for order in batches) < 20
    assert sum(order.remaining_work for order in batches) > 18
    assert len({split_env._line_for_order(order) for order in batches}) == 2


def test_risk_model_output_is_included_in_state_and_used_for_disruptions():
    env = make_env(
        orders_per_episode=1,
        disruption_risk_predictor=FixedRiskPredictor(),
    )
    observation, _ = env.reset(seed=5)

    assert np.allclose(observation[[4, 9, 14]], [0.2, 0.2, 0.2])


def test_truncation_penalizes_orders_not_delivered():
    env = make_env(
        orders_per_episode=1,
        max_episode_steps=1,
        idle_machine_penalty=0,
    )
    env.reset(
        seed=6,
        options={
            "orders": [
                {
                    "remaining_work": 20,
                    "due_time": 0,
                    "disruption_risk": 0,
                }
            ]
        },
    )

    _, reward, terminated, truncated, _ = env.step(env.ACTION_INJECT_BUFFER)

    assert terminated is False
    assert truncated is True
    assert reward < 0


def test_invalid_action_is_reported():
    env = make_env()
    env.reset(seed=8)

    with pytest.raises(ValueError, match="Invalid action"):
        env.step(4)
