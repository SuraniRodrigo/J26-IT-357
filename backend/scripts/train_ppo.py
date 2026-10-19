from __future__ import annotations

import argparse
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.rl.garment_env import GarmentProductionEnv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train an SB3 PPO policy for garment production rescheduling."
    )
    parser.add_argument(
        "--timesteps",
        type=int,
        default=50_000,
        help="Number of PPO environment steps (default: 50000).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=BACKEND_ROOT / "models_artifacts" / "production" / "garment_ppo",
        help="Output model path without the .zip extension.",
    )
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--orders-per-episode", type=int, default=12)
    parser.add_argument("--max-episode-steps", type=int, default=240)
    parser.add_argument(
        "--risk-model",
        type=Path,
        default=None,
        help=(
            "Optional joblib-serialized LightGBM-compatible probability model. "
            "It must implement predict_proba or predict."
        ),
    )
    parser.add_argument(
        "--tensorboard-log",
        type=Path,
        default=None,
        help="Optional TensorBoard log directory.",
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=("auto", "cpu", "cuda"),
        help="Stable-Baselines3 compute device.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.timesteps < 1:
        raise SystemExit("--timesteps must be at least 1")
    if args.orders_per_episode < 1 or args.max_episode_steps < 1:
        raise SystemExit("Episode order count and step limit must be positive")

    try:
        from stable_baselines3 import PPO
        from stable_baselines3.common.env_checker import check_env
        from stable_baselines3.common.monitor import Monitor
    except ImportError as exc:
        raise SystemExit(
            "PPO training requires Stable-Baselines3 and PyTorch; install "
            "the backend requirements before running this script."
        ) from exc

    risk_model = args.risk_model
    env = GarmentProductionEnv(
        orders_per_episode=args.orders_per_episode,
        max_episode_steps=args.max_episode_steps,
        disruption_risk_model_path=risk_model,
    )
    check_env(env, warn=True)
    monitored_env = Monitor(env)
    rollout_steps = max(2, min(2048, args.timesteps))
    batch_size = min(64, rollout_steps)
    while rollout_steps % batch_size:
        batch_size -= 1
    model = PPO(
        "MlpPolicy",
        monitored_env,
        n_steps=rollout_steps,
        batch_size=batch_size,
        seed=args.seed,
        device=args.device,
        verbose=1,
        tensorboard_log=str(args.tensorboard_log) if args.tensorboard_log else None,
    )
    model.learn(total_timesteps=args.timesteps)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(args.output))
    saved_path = (
        args.output
        if args.output.suffix == ".zip"
        else args.output.with_name(f"{args.output.name}.zip")
    )
    print(f"Saved PPO policy to {saved_path}")


if __name__ == "__main__":
    main()
