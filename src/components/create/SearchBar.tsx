import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
};

export function SearchBar({ prompt, setPrompt, onSearch, loading }: SearchBarProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <label className="mb-3 block text-sm font-medium text-gray-900">What would you like to color?</label>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A baby dragon in a flower garden"
            className="pl-9"
            aria-label="Search prompt"
          />
        </div>
        <Button onClick={onSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>
    </div>
  );
}
