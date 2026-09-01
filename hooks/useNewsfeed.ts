import { useQuery } from '@tanstack/react-query';
import { fetchUpcomingExamene, fetchUpcomingStagii, fetchUpcomingCompetitii, fetchAnunturiActive } from '../services/newsfeedService';
import type { NewsfeedItem, AnuntFederatie } from '../types';

interface NewsfeedData {
  items: NewsfeedItem[];
  anunturi: AnuntFederatie[];
}

export function useNewsfeed(clubId: string | null | undefined) {
  return useQuery<NewsfeedData>({
    queryKey: ['newsfeed', clubId ?? 'federatie'],
    queryFn: async () => {
      const [examene, stagii, competitii, anunturi] = await Promise.allSettled([
        clubId ? fetchUpcomingExamene(clubId) : Promise.resolve({ data: [], error: null }),
        clubId ? fetchUpcomingStagii(clubId) : Promise.resolve({ data: [], error: null }),
        fetchUpcomingCompetitii(),
        fetchAnunturiActive(),
      ]);

      const items: NewsfeedItem[] = [
        ...(examene.status === 'fulfilled' ? examene.value.data : []),
        ...(stagii.status === 'fulfilled' ? stagii.value.data : []),
        ...(competitii.status === 'fulfilled' ? competitii.value.data : []),
      ].sort((a, b) => a.data.localeCompare(b.data));

      const anunturiData = anunturi.status === 'fulfilled' ? anunturi.value.data : [];

      return { items, anunturi: anunturiData };
    },
    staleTime: 5 * 60 * 1000,
  });
}
