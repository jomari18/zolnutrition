import React, { useState } from "react";
import { Dialog } from "./Dialog";
import { Field } from "./ui";
import { number, scaleNutrition } from "./lib";
import { userError } from "./errors";
export default function EditEntry({ entry, busy, feedback, save, onClose }) {
  const [quantity, setQuantity] = useState(entry.quantity_g);
  return (
    <Dialog title={`Edit ${entry.food_name}`} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const q = number(quantity);
          if (q <= 0 || number(entry.quantity_g) <= 0) {
            await save(null, userError("Enter a positive amount."));
            return;
          }
          if (
            await save({
              quantity_g: q,
              ...scaleNutrition(
                { ...entry, serving_size_g: entry.quantity_g },
                q,
              ),
            })
          )
            onClose();
        }}
      >
        <Field
          label="Amount (g)"
          type="number"
          min="0.1"
          step="any"
          required
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <div className="actions">
          <button className="primary" disabled={busy}>
            Save
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
      {feedback}
    </Dialog>
  );
}
