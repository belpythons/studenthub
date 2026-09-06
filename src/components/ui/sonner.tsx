import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Global toast surface. Every mutation in the app reports through this so a
 * save, a delete, or a failure is always acknowledged on screen.
 */
export function Toaster(props: ToasterProps) {
  // Aplikasi menyetel enableSystem={false}; default "system" di sini akan
  // membuat toast gelap di mesin ber-OS gelap padahal UI-nya terang.
  const { theme = "light" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      closeButton
      richColors={false}
      duration={4500}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-pop group-[.toaster]:rounded-xl",
          title: "group-[.toast]:text-[13.5px] group-[.toast]:font-semibold",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[12.5px]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:group-[.toast]:text-xs group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-secondary group-[.toast]:text-secondary-foreground group-[.toast]:group-[.toast]:text-xs",
          error: "group-[.toaster]:border-destructive/35",
          success: "group-[.toaster]:border-success/35",
          warning: "group-[.toaster]:border-warning/40",
        },
      }}
      {...props}
    />
  );
}
