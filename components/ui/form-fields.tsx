"use client";

import * as React from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";

interface FormFieldWrapperProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  label,
  required,
  error,
  children,
}) => {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

interface FormInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

export function FormInput<T extends FieldValues>({
  name,
  control,
  label,
  type = "text",
  placeholder,
  required,
  maxLength,
  className,
  disabled,
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormFieldWrapper
          label={label}
          required={required}
          error={fieldState.error?.message}
        >
          <Input
            {...field}
            value={(field.value as string) ?? ""}
            type={type}
            placeholder={placeholder}
            maxLength={maxLength}
            className={className}
            disabled={disabled}
          />
        </FormFieldWrapper>
      )}
    />
  );
}

interface FormSelectProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  options: Record<string, string> | Array<{ value: string; label: string }>;
  disabled?: boolean;
}

export function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
  options,
  disabled,
}: FormSelectProps<T>) {
  const optionsArray = Array.isArray(options)
    ? options
    : Object.entries(options).map(([value, label]) => ({ value, label }));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormFieldWrapper
          label={label}
          required={required}
          error={fieldState.error?.message}
        >
          <Select
            value={(field.value as string) ?? ""}
            onValueChange={field.onChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {optionsArray.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormFieldWrapper>
      )}
    />
  );
}

interface FormDateInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  required?: boolean;
  disabled?: boolean;
}

function toDateInputValue(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") {
    // already a date string, return first 10 chars (YYYY-MM-DD)
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

export function FormDateInput<T extends FieldValues>({
  name,
  control,
  label,
  required,
  disabled,
}: FormDateInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormFieldWrapper
          label={label}
          required={required}
          error={fieldState.error?.message}
        >
          <Input
            {...field}
            value={toDateInputValue(field.value)}
            type="date"
            disabled={disabled}
          />
        </FormFieldWrapper>
      )}
    />
  );
}

interface FormNumberInputProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function FormNumberInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
  min,
  max,
  disabled,
}: FormNumberInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormFieldWrapper
          label={label}
          required={required}
          error={fieldState.error?.message}
        >
          <Input
            {...field}
            value={field.value ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              field.onChange(value === "" ? undefined : Number(value));
            }}
            type="number"
            placeholder={placeholder}
            min={min}
            max={max}
            disabled={disabled}
          />
        </FormFieldWrapper>
      )}
    />
  );
}

interface FormComboboxProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  required?: boolean;
  options: ComboboxOption[];
  disabled?: boolean;
}

export function FormCombobox<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
  options,
  disabled,
}: FormComboboxProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormFieldWrapper
          label={label}
          required={required}
          error={fieldState.error?.message}
        >
          <Combobox
            value={(field.value as string) ?? ""}
            onValueChange={field.onChange}
            options={options}
            placeholder={placeholder || "Pilih..."}
            disabled={disabled}
            allowClear
          />
        </FormFieldWrapper>
      )}
    />
  );
}
