import {
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
} from "./constants/user";

export const getEducationLevel = (id: number): string => {
  return EDUCATION_OPTIONS[id] || "Tidak Diketahui";
};

export const getJob = (id: number): string => {
  return JOB_OPTIONS[id] || "Lainnya";
};

export const getMaritalStatus = (status: string): string => {
  return MARITAL_STATUS_OPTIONS[status] || status;
};

export const getKKRelationshipStatus = (id: number): string => {
  return KK_RELATIONSHIP_STATUS[id] || "Lainnya";
};

export const getReligion = (id: number): string => {
  return RELIGION_OPTIONS[id] || "Lainnya";
};

// Reverse mapping functions for bulk import (handle both string values and numeric IDs)
export const parseReligion = (value: string | number): string => {
  if (typeof value === "number") {
    return getReligion(value);
  }
  const val = value.toString().trim();
  // Direct match
  if (RELIGION_OPTIONS[val]) {
    return val;
  }
  // Case-insensitive search
  const found = Object.keys(RELIGION_OPTIONS).find(
    (key) => key.toLowerCase() === val.toLowerCase()
  );
  return found || val;
};

export const parseEducation = (value: string | number): string => {
  if (typeof value === "number") {
    return getEducationLevel(value);
  }
  const val = value.toString().trim();
  // Direct match
  if (EDUCATION_OPTIONS[val]) {
    return val;
  }
  // Case-insensitive search
  const found = Object.keys(EDUCATION_OPTIONS).find(
    (key) => key.toLowerCase() === val.toLowerCase()
  );
  return found || val;
};

export const parseJob = (value: string | number): string => {
  if (typeof value === "number") {
    return getJob(value);
  }
  const val = value.toString().trim();
  // Direct match
  if (JOB_OPTIONS[val]) {
    return val;
  }
  // Case-insensitive search
  const found = Object.keys(JOB_OPTIONS).find(
    (key) => key.toLowerCase() === val.toLowerCase()
  );
  return found || val;
};

export const parseFamilyRole = (value: string | number): string => {
  if (typeof value === "number") {
    return getKKRelationshipStatus(value);
  }
  const val = value.toString().trim();
  // Direct match
  if (KK_RELATIONSHIP_STATUS[val]) {
    return val;
  }
  // Case-insensitive search
  const found = Object.keys(KK_RELATIONSHIP_STATUS).find(
    (key) => key.toLowerCase() === val.toLowerCase()
  );
  return found || val;
};
