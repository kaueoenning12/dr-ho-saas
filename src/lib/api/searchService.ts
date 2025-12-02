import Fuse from "fuse.js";
import { Document } from "@/types/database";
import { SearchFilters } from "@/types/models";

const fuseOptions = {
  keys: [
    { name: "title", weight: 0.4 },
    { name: "description", weight: 0.3 },
    { name: "keywords", weight: 0.2 },
    { name: "category", weight: 0.1 },
  ],
  threshold: 0.4, // 0 = exact match, 1 = match anything
  includeScore: true,
  minMatchCharLength: 2,
};

export class SearchService {
  private fuse: Fuse<Document> | null = null;

  initialize(documents: Document[]) {
    this.fuse = new Fuse(documents, fuseOptions);
  }

  search(filters: SearchFilters, documents: Document[]): Document[] {
    if (!this.fuse) {
      this.initialize(documents);
    }

    let results = documents;

    // Apply fuzzy search if query exists
    if (filters.query.trim()) {
      const fuseResults = this.fuse!.search(filters.query);
      results = fuseResults.map((result) => result.item);
    }

    // Filter by category
    if (filters.category && filters.category !== "All") {
      results = results.filter((doc) => doc.category === filters.category);
    }

    // Filter by date range
    if (filters.dateFrom) {
      results = results.filter(
        (doc) => new Date(doc.published_at) >= filters.dateFrom!
      );
    }
    if (filters.dateTo) {
      results = results.filter(
        (doc) => new Date(doc.published_at) <= filters.dateTo!
      );
    }

    // Sort results
    results = this.sortResults(results, filters.sortBy);

    return results;
  }

  private sortResults(
    documents: Document[],
    sortBy: SearchFilters["sortBy"]
  ): Document[] {
    const sorted = [...documents];

    switch (sortBy) {
      case "date":
        sorted.sort(
          (a, b) =>
            new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        break;
      case "views":
        sorted.sort((a, b) => b.views - a.views);
        break;
      case "likes":
        sorted.sort((a, b) => b.likes - a.likes);
        break;
      case "relevance":
      default:
        // Already sorted by Fuse relevance score
        break;
    }

    return sorted;
  }

  saveSearchHistory(query: string, userId: string): void {
    const key = `search_history_${userId}`;
    const stored = localStorage.getItem(key);
    const history: string[] = stored ? JSON.parse(stored) : [];
    
    // Add to beginning, remove duplicates, keep last 10
    const updated = [query, ...history.filter((q) => q !== query)].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  getSearchHistory(userId: string): string[] {
    const key = `search_history_${userId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }
}

export const searchService = new SearchService();
