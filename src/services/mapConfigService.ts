import { supabase } from '../../utils/supabase';

export interface MapTileSource {
  id: string;
  displayName: string;
  urlTemplate: string;
  apiKey: string | null;
  attribution: string;
}

/** Fetches enabled XYZ raster sources in their configured failover order. */
export async function getMapTileSources(): Promise<MapTileSource[]> {
  try {
    const { data, error } = await supabase
      .from('map_tile_sources')
      .select('id, display_name, url_template, api_key, attribution')
      .eq('is_enabled', true)
      .order('priority', { ascending: true });

    if (error) {
      console.warn('Unable to load map tile sources:', error.message);
      return [];
    }

    return (data ?? [])
      .filter((source) => source.url_template.startsWith('https://'))
      .map((source) => ({
        id: source.id,
        displayName: source.display_name,
        urlTemplate: source.url_template,
        apiKey: source.api_key?.trim() || null,
        attribution: source.attribution,
      }));
  } catch (error) {
    console.warn('Unable to load map tile sources:', error);
    return [];
  }
}
