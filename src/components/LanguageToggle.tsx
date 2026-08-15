import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "en" ? "es" : "en")}
      className="gap-1.5 text-white/70 hover:text-white hover:bg-white/10"
      title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-medium uppercase">{lang === "en" ? "ES" : "EN"}</span>
    </Button>
  );
}
