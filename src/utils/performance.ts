/**
 * Performance Monitoring Utilities
 * 
 * Utilitaires pour le Real User Monitoring (RUM) et le suivi des Web Vitals.
 * Collecte les métriques de performance et les envoie à un endpoint si configuré.
 */

import { useEffect, useRef } from 'react';

// Types pour les métriques Web Vitals
export interface WebVitalsMetrics {
  // Core Web Vitals
  LCP?: number;  // Largest Contentful Paint (ms)
  FID?: number;  // First Input Delay (ms)
  CLS?: number;  // Cumulative Layout Shift
  INP?: number;  // Interaction to Next Paint (ms)
  
  // Autres métriques importantes
  FCP?: number;  // First Contentful Paint (ms)
  TTFB?: number; // Time to First Byte (ms)
  TTI?: number;  // Time to Interactive (ms)
  
  // Métriques personnalisées
  appLoadTime?: number;
  routeChangeTime?: number;
}

// Configuration
interface PerformanceConfig {
  endpoint?: string;
  apiKey?: string;
  sampleRate?: number;
  enabled?: boolean;
  debug?: boolean;
}

// État global
let config: PerformanceConfig = {
  enabled: true,
  sampleRate: 1.0,
  debug: import.meta.env.DEV,
};

let metricsCollected: Partial<WebVitalsMetrics> = {};

/**
 * Configure le monitoring de performance
 */
export function configurePerformance(userConfig: PerformanceConfig): void {
  config = { ...config, ...userConfig };
}

/**
 * Log de debug conditionnel
 */
function debugLog(...args: unknown[]): void {
  if (config.debug) {
    console.log('[Performance]', ...args);
  }
}

/**
 * Envoie les métriques collectées à l'endpoint configuré
 */
async function sendMetrics(metrics: Partial<WebVitalsMetrics>): Promise<void> {
  if (!config.enabled || !config.endpoint) {
    debugLog('Metrics not sent (disabled or no endpoint):', metrics);
    return;
  }
  
  // Échantillonnage
  if (Math.random() > (config.sampleRate || 1)) {
    return;
  }
  
  const payload = {
    metrics,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: (navigator as unknown as { connection?: { effectiveType: string } }).connection?.effectiveType,
  };
  
  try {
    // Utiliser sendBeacon si disponible, sinon fetch
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(config.endpoint, blob);
    } else {
      await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    }
    
    debugLog('Metrics sent:', metrics);
  } catch (error) {
    console.error('Failed to send performance metrics:', error);
  }
}

/**
 * Mesure le Largest Contentful Paint (LCP)
 */
function measureLCP(): void {
  if (!('PerformanceObserver' in window)) {return;}
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
    
    const lcp = lastEntry.startTime;
    metricsCollected.LCP = lcp;
    
    debugLog('LCP:', lcp.toFixed(2), 'ms');
    
    // Envoyer immédiatement car LCP peut évoluer
    sendMetrics({ LCP: lcp });
  });
  
  observer.observe({ entryTypes: ['largest-contentful-paint'] as const });
}

/**
 * Mesure le First Input Delay (FID)
 */
function measureFID(): void {
  if (!('PerformanceObserver' in window)) {return;}
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries() as (PerformanceEntry & {
      processingStart: number;
      startTime: number;
    })[];
    
    for (const entry of entries) {
      const fid = entry.processingStart - entry.startTime;
      metricsCollected.FID = fid;
      
      debugLog('FID:', fid.toFixed(2), 'ms');
      sendMetrics({ FID: fid });
    }
  });
  
  observer.observe({ entryTypes: ['first-input'] as const });
}

/**
 * Mesure le Cumulative Layout Shift (CLS)
 */
function measureCLS(): void {
  if (!('PerformanceObserver' in window)) {return;}
  
  let clsValue = 0;
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Ignorer les shifts causés par une interaction utilisateur
      if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
        clsValue += (entry as unknown as { value: number }).value;
        metricsCollected.CLS = clsValue;
      }
    }
    
    debugLog('CLS:', clsValue.toFixed(4));
  });
  
  observer.observe({ entryTypes: ['layout-shift'] as const });
  
  // Envoyer CLS à la fin de la session
  window.addEventListener('beforeunload', () => {
    sendMetrics({ CLS: clsValue });
  });
}

/**
 * Mesure l'Interaction to Next Paint (INP)
 */
function measureINP(): void {
  if (!('PerformanceObserver' in window)) {return;}
  
  const interactions: number[] = [];
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries() as (PerformanceEntry & {
      processingStart: number;
      startTime: number;
      duration: number;
    })[];
    
    for (const entry of entries) {
      const duration = entry.duration;
      interactions.push(duration);
      
      // Calculer l'INP (98e percentile)
      if (interactions.length >= 10) {
        const sorted = [...interactions].sort((a, b) => b - a);
        const inpIndex = Math.floor(sorted.length * 0.02);
        const inp = sorted[inpIndex] || sorted[0] || 0;
        
        metricsCollected.INP = inp;
        debugLog('INP:', inp.toFixed(2), 'ms');
      }
    }
  });
  
  // Observer les événements de performance
  try {
    observer.observe({ entryTypes: ['event'] as const, buffered: true });
  } catch {
    // Certains navigateurs ne supportent pas 'event'
    debugLog('INP measurement not supported');
  }
}

/**
 * Mesure le First Contentful Paint (FCP)
 */
function measureFCP(): void {
  if (!('PerformanceObserver' in window)) {return;}
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries() as PerformancePaintTiming[];
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
    
    if (fcpEntry) {
      metricsCollected.FCP = fcpEntry.startTime;
      debugLog('FCP:', fcpEntry.startTime.toFixed(2), 'ms');
      sendMetrics({ FCP: fcpEntry.startTime });
    }
  });
  
  observer.observe({ entryTypes: ['paint'] as const });
}

/**
 * Mesure le Time to First Byte (TTFB)
 */
function measureTTFB(): void {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navigation) {
    const ttfb = navigation.responseStart - navigation.startTime;
    metricsCollected.TTFB = ttfb;
    debugLog('TTFB:', ttfb.toFixed(2), 'ms');
    sendMetrics({ TTFB: ttfb });
  }
}

/**
 * Mesure le Time to Interactive (TTI)
 * Approximation basée sur le Long Tasks API
 */
function measureTTI(): void {
  if (!('PerformanceObserver' in window)) {return;}
  
  let lastLongTaskEnd = 0;
  const startTime = performance.now();
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const endTime = entry.startTime + (entry as unknown as { duration: number }).duration;
      if (endTime > lastLongTaskEnd) {
        lastLongTaskEnd = endTime;
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['longtask'] as const });
    
    // Considérer TTI après 5 secondes sans long task
    setTimeout(() => {
      const tti = lastLongTaskEnd > 0 ? lastLongTaskEnd : performance.now() - startTime;
      metricsCollected.TTI = tti;
      debugLog('TTI:', tti.toFixed(2), 'ms');
      sendMetrics({ TTI: tti });
      observer.disconnect();
    }, 5000);
  } catch {
    debugLog('TTI measurement not supported');
  }
}

/**
 * Hook React pour mesurer le temps de rendu d'un composant
 */
export function useRenderTime(componentName: string): void {
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const renderTime = performance.now() - startTime.current;
    
    if (renderTime > 16.67) { // Plus d'un frame (60fps)
      debugLog(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  });
}

/**
 * Hook React pour mesurer le temps de changement de route
 */
export function useRouteTiming(): void {
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const handleRouteChange = () => {
      const routeTime = performance.now() - startTime.current;
      metricsCollected.routeChangeTime = routeTime;
      debugLog('Route change time:', routeTime.toFixed(2), 'ms');
      sendMetrics({ routeChangeTime: routeTime });
    };
    
    // Attendre que la route soit stable
    const timeout = setTimeout(handleRouteChange, 100);
    
    return () => { clearTimeout(timeout); };
  }, []);
}

/**
 * Marque une étape de chargement de l'application
 */
export function markAppLoad(stage: string): void {
  const markName = `app-${stage}`;
  performance.mark(markName);
  debugLog(`App load stage: ${stage}`);
  
  if (stage === 'complete') {
    // Mesurer le temps total de chargement
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.startTime;
      metricsCollected.appLoadTime = loadTime;
      sendMetrics({ appLoadTime: loadTime });
    }
  }
}

/**
 * Mesure le temps d'exécution d'une fonction
 */
export function measureFunction<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const result = fn(...args) as ReturnType<T>;
    
    // Gérer les promesses
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        debugLog(`Function ${name} took ${duration.toFixed(2)}ms`);
      }) as ReturnType<T>;
    }
    
    const duration = performance.now() - start;
    debugLog(`Function ${name} took ${duration.toFixed(2)}ms`);
    
    return result;
  }) as T;
}

/**
 * Démarre la collecte de toutes les métriques Web Vitals
 */
export function startWebVitalsTracking(userConfig?: PerformanceConfig): void {
  if (userConfig) {
    configurePerformance(userConfig);
  }
  
  if (!config.enabled) {
    debugLog('Performance tracking disabled');
    return;
  }
  
  debugLog('Starting Web Vitals tracking...');
  
  // Attendre que la page soit chargée
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
}

function initializeTracking(): void {
  measureTTFB();
  measureFCP();
  measureLCP();
  measureFID();
  measureCLS();
  measureINP();
  measureTTI();
  
  // Envoyer toutes les métriques au unload
  window.addEventListener('beforeunload', () => {
    sendMetrics(metricsCollected);
  });
  
  // Envoyer après 10 secondes (backup)
  setTimeout(() => {
    sendMetrics(metricsCollected);
  }, 10000);
}

/**
 * Récupère toutes les métriques collectées
 */
export function getCollectedMetrics(): Partial<WebVitalsMetrics> {
  return { ...metricsCollected };
}

/**
 * Réinitialise les métriques collectées
 */
export function resetMetrics(): void {
  metricsCollected = {};
}

export default {
  startWebVitalsTracking,
  configurePerformance,
  useRenderTime,
  useRouteTiming,
  markAppLoad,
  measureFunction,
  getCollectedMetrics,
  resetMetrics,
};
