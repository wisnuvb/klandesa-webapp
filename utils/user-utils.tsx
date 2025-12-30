import { get } from "http";
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
