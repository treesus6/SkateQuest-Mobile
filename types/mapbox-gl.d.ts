declare global {
  interface MapboxGLMarker {
    setLngLat(coordinates: [number, number]): MapboxGLMarker;
    setPopup(popup: MapboxGLPopup): MapboxGLMarker;
    addTo(map: MapboxGLMap): MapboxGLMarker;
    remove(): void;
  }

  interface MapboxGLPopup {
    setText(text: string): MapboxGLPopup;
  }

  interface MapboxGLMap {
    on(event: string, callback: (event: MapboxGLEvent) => void): void;
    remove(): void;
    flyTo(options: { center: [number, number]; zoom: number }): void;
    getCenter(): { lat: number; lng: number };
    resize(): void;
  }

  interface MapboxGLEvent {
    lngLat: { lng: number; lat: number };
  }

  interface MapboxGLGlobal {
    accessToken: string;
    Map: new (options: {
      container: HTMLElement;
      style: string;
      center: [number, number];
      zoom: number;
      attributionControl?: boolean;
    }) => MapboxGLMap;
    Marker: new (options?: { color?: string }) => MapboxGLMarker;
    Popup: new (options?: { offset?: number }) => MapboxGLPopup;
  }

  interface Window {
    mapboxgl?: MapboxGLGlobal;
  }
}

export {};
