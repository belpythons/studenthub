import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "@/components/motion/motion-primitives";

/** Horizontal scroll is contained here so the page body never scrolls sideways. */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table ref={ref} className={cn("w-full caption-bottom border-collapse text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn(className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />,
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-foreground transition-colors last:border-0 hover:bg-accent/45 data-[state=selected]:bg-accent",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

/**
 * TableRow yang bisa dianimasikan.
 *
 * Membungkus komponen yang sama, bukan menyalin kelasnya ke sebuah motion.tr:
 * satu salinan className akan diam-diam menyimpang begitu TableRow disunting,
 * dan tabel yang barisnya beda gaya adalah bug yang tidak akan terlihat sampai
 * ada yang mengubah border.
 */
const MotionTableRow = motion.create(TableRow);

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "whitespace-nowrap border-b border-foreground px-3.5 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.06em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-3.5 py-3.5 align-top text-[13.5px]", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

export { MotionTableRow, Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
