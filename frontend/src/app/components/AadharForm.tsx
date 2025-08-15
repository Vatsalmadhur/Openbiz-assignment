"use client";

import { useState } from "react";
import scrapedData from "@/formData.json"; // adjust import path

export default function AadharForm() {
  // here we assume your JSON has something like { "fields": [ ... ] }
  const fields = scrapedData.fields || [];

  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [submitMsg, setSubmitMsg] = useState("");

  function validateField(field, value) {
    let msg = "";

    if (field.required && !value.trim()) {
      msg = `${field.placeholder || field.name} is required`;
    }

    if (field.maxLength && value.length > field.maxLength) {
      msg = `${field.placeholder || field.name} must be at most ${field.maxLength} characters`;
    }

    if (field.pattern) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        msg = `${field.placeholder || field.name} format is invalid`;
      }
    }

    return msg;
  }

  function handleChange(e, field) {
    const { value } = e.target;
    setFormData({ ...formData, [field.id]: value });

    if (errors[field.id]) {
      setErrors((prev) => ({ ...prev, [field.id]: "" }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let newErrors = {};

    fields.forEach((field) => {
      const err = validateField(field, formData[field.id] || "");
      if (err) newErrors[field.id] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/udyam/step1`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // convert formData keys into API expected keys dynamically
          body: JSON.stringify(
            fields.reduce((acc, field) => {
              // You can map JSON field keys to DB/API keys here if they differ
              acc[field.apiKey || field.id] = formData[field.id];
              return acc;
            }, {})
          ),
        }
      );

      const result = await res.json();
      if (res.ok) {
        setSubmitMsg("✅ Submitted successfully");
        setFormData({});
      } else {
        setSubmitMsg(`❌ Error: ${result.message}`);
      }
    } catch (err) {
      setSubmitMsg("❌ Failed to submit");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow-md mt-8">
      <h1 className="text-xl font-bold mb-4">Udyam Registration — Step 1</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.id}>
            {field.type !== "hidden" && (
              <label className="block mb-1 font-medium">
                {field.placeholder || field.name}
              </label>
            )}
            <input
              type={field.type || "text"}
              value={formData[field.id] || ""}
              onChange={(e) => handleChange(e, field)}
              maxLength={field.maxLength > 0 ? field.maxLength : undefined}
              placeholder={field.placeholder}
              className={`w-full border px-3 py-2 rounded ${
                errors[field.id] ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors[field.id] && (
              <p className="text-red-500 text-sm">{errors[field.id]}</p>
            )}
          </div>
        ))}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Submit
        </button>
      </form>

      {submitMsg && <p className="mt-3 text-sm font-medium">{submitMsg}</p>}
    </div>
  );
}
