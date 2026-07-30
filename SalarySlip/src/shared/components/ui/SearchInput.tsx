import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[9px] border border-line bg-hover px-[11px] py-[7px] text-mist">
      <Search size={15} />
      <input
        className="w-[230px] border-none bg-transparent text-ink outline-none max-mob:w-[170px]"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
