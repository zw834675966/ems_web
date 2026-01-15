import { http } from "@/utils/http";
import type { ApiResponse } from "./types";

export type DeviceDto = {
  deviceId: string;
  projectId: string;
  gatewayId: string;
  name: string;
  model?: string;
};

export type CreateDeviceRequest = {
  gatewayId: string;
  name: string;
  model?: string;
};

export const listDevices = (projectId: string) => {
  return http.request<ApiResponse<DeviceDto[]>>(
    "get",
    `/projects/${projectId}/devices`
  );
};

export const createDevice = (projectId: string, data: CreateDeviceRequest) => {
  return http.request<ApiResponse<DeviceDto>>(
    "post",
    `/projects/${projectId}/devices`,
    { data }
  );
};
