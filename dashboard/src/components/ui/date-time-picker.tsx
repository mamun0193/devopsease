import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const ITEM_H = 36;

function TimeColumn({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx !== -1 && listRef.current) {
      // py-[72px] pads both ends; centering item idx means scrollTop = idx * ITEM_H
      listRef.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }
  }, [selected, values]);

  return (
    <div className="relative flex-1">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-9 bg-slate-700/60 rounded-md z-10" />
      <div
        ref={listRef}
        className="h-[180px] overflow-y-auto scroll-smooth py-[72px]"
        style={{ scrollbarWidth: "none" }}
      >
        {values.map((v) => (
          <div
            key={v}
            onClick={() => onSelect(v)}
            className={cn(
              "flex items-center justify-center h-9 text-sm font-medium cursor-pointer rounded-md transition-colors select-none relative z-20",
              v === selected ? "text-white" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DateTimePicker({
  date,
  onDateChange,
  placeholder = "Pick a date and time",
  className,
}: DateTimePickerProps) {
  const [hour, setHour] = React.useState<string>(date ? format(date, "HH") : "00");
  const [minute, setMinute] = React.useState<string>(date ? format(date, "mm") : "00");
  // Pending values while the time overlay is open
  const [pendingHour, setPendingHour] = React.useState<string>(hour);
  const [pendingMinute, setPendingMinute] = React.useState<string>(minute);
  const [timeOpen, setTimeOpen] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);

  const openTimeOverlay = () => {
    setPendingHour(hour);
    setPendingMinute(minute);
    setTimeOpen(true);
  };

  const handleConfirm = () => {
    setHour(pendingHour);
    setMinute(pendingMinute);
    if (date) {
      const d = new Date(date);
      d.setHours(Number(pendingHour), Number(pendingMinute), 0, 0);
      onDateChange(d);
    }
    setTimeOpen(false);
    setPopoverOpen(false); // close the entire popover
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) { onDateChange(undefined); return; }
    selectedDate.setHours(Number(hour), Number(minute), 0, 0);
    onDateChange(selectedDate);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(undefined);
    setHour("00"); setMinute("00");
    setPendingHour("00"); setPendingMinute("00");
  };

  return (
    <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) setTimeOpen(false); }}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "justify-start text-left font-normal bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300",
            !date && "text-slate-500",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP HH:mm") : <span>{placeholder}</span>}
          {date && (
            <X
              className="ml-auto h-4 w-4 hover:text-red-400 transition-colors"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 overflow-hidden" align="start">
        {/* Wrapper — position:relative so the overlay can cover only the calendar */}
        <div className="relative flex flex-col">

          {/* Time overlay — covers the calendar area */}
          {timeOpen && (
            <div className="absolute inset-x-0 top-0 bottom-[56px] z-30 bg-slate-900/95 backdrop-blur-sm flex flex-col p-4 gap-3">
              <p className="text-xs text-slate-400 text-center">Select time</p>

              <div className="flex gap-2 rounded-xl bg-slate-800/70 border border-slate-700/50 p-2">
                <TimeColumn values={HOURS} selected={pendingHour} onSelect={setPendingHour} />
                <div className="flex flex-col justify-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-500" />
                  <div className="w-1 h-1 rounded-full bg-slate-500" />
                </div>
                <TimeColumn values={MINUTES} selected={pendingMinute} onSelect={setPendingMinute} />
              </div>

              <div className="text-center font-mono text-2xl font-semibold text-white tracking-widest">
                {pendingHour}:{pendingMinute}
              </div>

              {/* Enter / Confirm */}
              <button
                onClick={handleConfirm}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-sm font-semibold text-white"
              >
                <Check size={15} />
                Apply
              </button>
            </div>
          )}

          {/* Calendar */}
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            disabled={(d) => d > new Date()}
            className="bg-slate-900"
          />

          {/* Time bar at bottom — click to open overlay */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-700 bg-slate-900">
            <button
              onClick={openTimeOverlay}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 transition-colors group"
            >
              <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300">
                <Clock size={14} />
                <span className="text-xs">Time</span>
              </div>
              <span className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                {hour}:{minute}
              </span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
