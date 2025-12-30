import { headers } from "next/headers";

export async function getTenant() {
  const headersList = await headers();
  const subdomain = headersList.get("x-tenant-subdomain");

  if (!subdomain) {
    return null;
  }

  // TODO: Fetch tenant data from database based on subdomain
  // For now, return mock data
  return {
    subdomain,
    name: subdomain.charAt(0).toUpperCase() + subdomain.slice(1),
    // Add more tenant fields as needed
  };
}
