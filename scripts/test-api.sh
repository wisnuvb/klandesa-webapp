#!/bin/bash

# Script untuk testing API endpoints
# Jalankan: npm run test:api

API_URL="http://localhost:3000/api"
VILLAGE_CODE="DESA001"

echo "🧪 Testing Village Potentials API Endpoints"
echo "=========================================="
echo ""

# Test 1: GET all village potentials
echo "📌 Test 1: GET /api/village-potentials"
curl -s "$API_URL/village-potentials?page=1&pageSize=10" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 2: GET with year filter
echo "📌 Test 2: GET /api/village-potentials (with year filter)"
curl -s "$API_URL/village-potentials?page=1&pageSize=10&year=2024" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 3: GET with search
echo "📌 Test 3: GET /api/village-potentials (with search)"
curl -s "$API_URL/village-potentials?search=pertanian" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 4: POST new village potential
echo "📌 Test 4: POST /api/village-potentials (create new)"
curl -s -X POST "$API_URL/village-potentials" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" \
  -d '{
    "year": "2025",
    "population": 5600,
    "households": 1400,
    "area": 1250,
    "agricultureLand": 460,
    "plantationLand": 330,
    "forestArea": 275,
    "educationFacilities": 8,
    "healthFacilities": 3,
    "tourismSpots": 6,
    "waterResources": "Sungai Bone, 4 Mata Air, 18 Sumur Bor",
    "economicPotential": "Pertanian Padi, Perkebunan Kelapa Sawit, Peternakan Sapi, Kerajinan Tangan, Wisata Alam"
  }' | jq '.'
echo ""
echo ""

echo "📌 Test 5: GET /api/positions"
curl -s "$API_URL/positions?page=1&pageSize=10" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

echo "📌 Test 6: GET /api/officials"
curl -s "$API_URL/officials?page=1&pageSize=10" \
  -H "x-tenant-subdomain: desa001" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

echo "✅ API Testing Complete!"
