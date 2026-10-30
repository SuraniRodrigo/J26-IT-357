import { useState } from "react";

const lineLabels = {
  alpha: "Line 01",
  beta: "Line 02",
  gamma: "Line 03",
};

export default function ProductionPlanModal({ lines, onClose, onSave }) {
  const [draft, setDraft] = useState(() =>
    lines.map((line) => ({
      id: line.id,
      name: line.name,
      order: line.order,
      product: line.product,
      plannedUnits: String(line.plannedUnits),
    })),
  );
  const [error, setError] = useState("");

  function updateLine(lineId, field, value) {
    setDraft((current) =>
      current.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line,
      ),
    );
  }

  function submit(event) {
    event.preventDefault();
    const plan = draft.map((line) => ({
      id: line.id,
      order: line.order.trim(),
      product: line.product.trim(),
      plannedUnits: Number(line.plannedUnits),
    }));

    if (
      plan.some(
        (line) =>
          !line.product ||
          !Number.isSafeInteger(line.plannedUnits) ||
          line.plannedUnits < 1 ||
          line.plannedUnits > 10000000,
      )
    ) {
      setError("Enter a product and a whole-number quantity from 1 to 10,000,000 for every line.");
      return;
    }

    if (onSave(plan)) {
      onClose();
      return;
    }

    setError(
      "The plan could not be saved in this browser. Check available storage and try again.",
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="dialog glass-card production-plan-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-plan-title"
      >
        <div className="dialog-heading">
          <div>
            <span className="section-kicker">TODAY'S PRODUCTION</span>
            <h2 id="production-plan-title">Set the production plan</h2>
            <p>
              Enter what each line should make. The overview will use these
              quantities to show output and progress.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close production plan"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="production-plan-fields">
            {draft.map((line) => (
              <fieldset className="production-plan-line" key={line.id}>
                <legend>{lineLabels[line.id] || line.name}</legend>
                <label>
                  Product or style
                  <input
                    type="text"
                    value={line.product}
                    onChange={(event) =>
                      updateLine(line.id, "product", event.target.value)
                    }
                    placeholder="For example, cotton polo shirt"
                    required
                  />
                </label>
                <label>
                  Order number <span>(optional)</span>
                  <input
                    type="text"
                    value={line.order}
                    onChange={(event) =>
                      updateLine(line.id, "order", event.target.value)
                    }
                    placeholder="For example, ORD-2050"
                  />
                </label>
                <label>
                  Units to produce
                  <input
                    type="number"
                    min="1"
                    max="10000000"
                    step="1"
                    value={line.plannedUnits}
                    onChange={(event) =>
                      updateLine(line.id, "plannedUnits", event.target.value)
                    }
                    required
                  />
                </label>
              </fieldset>
            ))}
          </div>
          {error && (
            <div className="plan-form-error" role="alert">
              {error}
            </div>
          )}
          <p className="production-plan-note">
            This demo saves the plan in this browser only. It is not shared with
            other users or factories.
          </p>
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-muted"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="button button-primary">
              Save production plan
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
