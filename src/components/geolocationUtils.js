const DEFAULT_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export const getCurrentUserLocation = (options = {}) => new Promise((resolve, reject) => {
  if (!("geolocation" in navigator)) {
    reject(new Error("Geolocation is not supported by your browser."));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = Number(position?.coords?.latitude);
      const lon = Number(position?.coords?.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        reject(new Error("Invalid coordinates received from geolocation."));
        return;
      }

      resolve({ lat, lon });
    },
    (error) => {
      reject(new Error(error?.message || "Unable to access your current location."));
    },
    {
      ...DEFAULT_GEOLOCATION_OPTIONS,
      ...options,
    }
  );
});
