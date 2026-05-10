"use client"

import { useEffect, useRef } from "react"

interface Layer {
  id: number
  name: string
  geojson: string
}

export function PortalMapView({ layers }: { layers: Layer[] }) {
  const mapRef  = useRef<HTMLDivElement>(null)
  const mapInst = useRef<unknown>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return

    async function init() {
      const L = (await import("leaflet")).default
      // @ts-expect-error — leaflet CSS import
      await import("leaflet/dist/leaflet.css")

      const map = L.map(mapRef.current!, {
        center: [-5, -50],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      })
      mapInst.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      if (layers.length === 0) return

      const bounds: [number, number][] = []

      layers.forEach((layer, idx) => {
        try {
          const geojson = typeof layer.geojson === "string"
            ? JSON.parse(layer.geojson) as object
            : layer.geojson

          const colors = [
            "oklch(0.55 0.13 155)", "oklch(0.55 0.13 230)",
            "oklch(0.65 0.14 25)", "oklch(0.65 0.13 75)",
          ]
          const color = colors[idx % colors.length]

          const geoLayer = L.geoJSON(geojson as GeoJSON.GeoJsonObject, {
            style: {
              color,
              weight: 2,
              fillOpacity: 0.15,
              fillColor: color,
            },
          }).addTo(map)

          geoLayer.bindTooltip(layer.name, { sticky: true })

          const layerBounds = geoLayer.getBounds()
          if (layerBounds.isValid()) {
            bounds.push(
              [layerBounds.getSouth(), layerBounds.getWest()],
              [layerBounds.getNorth(), layerBounds.getEast()],
            )
          }
        } catch {
          // GeoJSON inválido — ignora silenciosamente
        }
      })

      if (bounds.length > 0) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [30, 30] })
      }
    }

    init().catch(console.error)

    return () => {
      if (mapInst.current) {
        ;(mapInst.current as { remove(): void }).remove()
        mapInst.current = null
      }
    }
  }, [layers])

  return <div ref={mapRef} className="w-full h-full" />
}
