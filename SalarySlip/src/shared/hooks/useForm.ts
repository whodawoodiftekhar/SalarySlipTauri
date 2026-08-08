import { useState, type ChangeEvent } from "react";

/**
 * Common custom form state hook for handling unified form input state and submissions.
 */
export function useForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setValue = <K extends keyof T>(field: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = (newValues?: T) => {
    setValues(newValues || initialValues);
  };

  return { values, setValues, handleChange, setValue, resetForm };
}
