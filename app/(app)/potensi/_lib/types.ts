export type VillagePotential = {
  id: number;
  villageId: number;
  year: string;
  population: number;
  households: number;
  area: number;
  agricultureLand: number;
  plantationLand: number;
  forestArea: number;
  educationFacilities: number;
  healthFacilities: number;
  tourismSpots: number;
  waterResources: string | null;
  economicPotential: string | null;
  createdAt: string;
  updatedAt: string;
};

