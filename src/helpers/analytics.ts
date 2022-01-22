import ReactGA from "react-ga";

import { EnvHelper } from "./Environment";

const SEGMENT_API_KEY = EnvHelper.getSegmentKey();
const GA_API_KEY = EnvHelper.getGaKey();
const GA_4_API_KEY = EnvHelper.getGa4Key();

declare global {
  interface Window {
    analytics: any; // Segment.js
    gtag: any; // Google Tag Manager
  }
}

type SegmentEvent = {
  type: string;
  [key: string]: any;
};

export const trackSegmentEvent = (event: SegmentEvent) => {
  try {
    if (SEGMENT_API_KEY && window.analytics) {
      window.analytics.track(event.type, event, { context: { ip: "0.0.0.0" } });
    }
    // NOTE: We do not send Segment events -> Google Analytics
  } catch (e) {
    console.log("trackSegmentEvent", e);
  }
};

export const trackGAEvent = (event: ReactGA.EventArgs) => {
  try {
    if (GA_API_KEY && ReactGA) {
      ReactGA.event(event);
    }

    if (GA_4_API_KEY && window.gtag) {
      window.gtag("event", event.action, {
        event_category: event.category,
        event_label: event?.label,
        dimension1: event?.dimension1,
        dimension2: event?.dimension2,
        metric1: event?.metric1,
      });
    }
  } catch (e) {
    console.log("trackGAEvent", e);
  }
};
