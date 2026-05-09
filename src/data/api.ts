import {
  getMockMasterById,
  getMockServiceById,
  getMockSlots,
  mockMasters,
  mockServices,
} from "./mock";

function getMockResponse(path: string): unknown {
  if (path === "/api/services") return mockServices;
  if (path === "/api/masters") return mockMasters;

  if (path.startsWith("/api/services/")) {
    const serviceId = Number(path.split("/").pop());
    const service = getMockServiceById(serviceId);
    if (!service) throw new Error("Service not found");
    return service;
  }

  if (path.startsWith("/api/masters/")) {
    const masterId = Number(path.split("/").pop());
    const master = getMockMasterById(masterId);
    if (!master) throw new Error("Master not found");
    return master;
  }

  if (path.startsWith("/api/slots")) {
    return getMockSlots();
  }

  throw new Error("No mock for endpoint");
}

export async function fetchJsonWithFallback<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET";

  if (method !== "GET") {
    const response = await fetch(path, init);
    if (!response.ok) throw new Error("Request failed");
    return response.json() as Promise<T>;
  }

  try {
    const response = await fetch(path, init);
    if (!response.ok) throw new Error("Request failed");
    return response.json() as Promise<T>;
  } catch {
    return getMockResponse(path) as T;
  }
}
