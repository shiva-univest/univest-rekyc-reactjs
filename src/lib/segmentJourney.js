const SEGMENT_JOURNEY_KEY = "segmentJourneyRoute";

export const getSegmentJourneyRoute = (fallbackRoute = "/segment") => {
  if (typeof window === "undefined") return fallbackRoute;

  const storedRoute = window.sessionStorage.getItem(SEGMENT_JOURNEY_KEY);
  return storedRoute || fallbackRoute;
};

export const setSegmentJourneyRoute = (route) => {
  if (typeof window === "undefined" || !route) return;
  window.sessionStorage.setItem(SEGMENT_JOURNEY_KEY, route);
};

export const resolveSegmentJourneyRoute = (
  routeFromState,
  fallbackRoute = "/segment"
) => {
  const resolvedRoute = routeFromState || getSegmentJourneyRoute(fallbackRoute);
  setSegmentJourneyRoute(resolvedRoute);
  return resolvedRoute;
};
