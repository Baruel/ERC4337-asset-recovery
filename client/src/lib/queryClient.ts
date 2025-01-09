import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Handle both API and blockchain queries
        const url = queryKey[0] as string;

        if (!url.startsWith('/api')) {
          throw new Error('Invalid query key format');
        }

        const res = await fetch(url, {
          credentials: "include",
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`Server error: ${res.status}`);
          }
          throw new Error(await res.text());
        }

        return res.json();
      },
      // Refresh data every 30 seconds for blockchain data
      refetchInterval: 30000,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Keep data fresh for 10 seconds
      staleTime: 10000,
      // Retry failed requests 3 times
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    }
  },
});