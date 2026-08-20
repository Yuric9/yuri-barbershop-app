"use client";

import { useEffect } from "react";

export default function BookingHubFetchBridge(){
  useEffect(()=>{
    const originalFetch=window.fetch.bind(window);
    const patchedFetch:typeof window.fetch=(input,init)=>{
      try{
        const raw=typeof input==="string"?input:input instanceof URL?input.toString():input.url;
        const url=new URL(raw,window.location.origin);
        if(url.origin===window.location.origin && url.pathname==="/api/data" && !url.search){
          return originalFetch("/api/booking-hub",init);
        }
      }catch{}
      return originalFetch(input as RequestInfo|URL,init);
    };
    window.fetch=patchedFetch;
    return()=>{window.fetch=originalFetch;};
  },[]);
  return null;
}
