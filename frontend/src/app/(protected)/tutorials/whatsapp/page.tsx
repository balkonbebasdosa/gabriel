import { TutorialPage } from "@/components/TutorialPage";

export default function WhatsAppTutorialPage() {
  return (
    <TutorialPage
      platformLabel="WhatsApp"
      icon="forum"
      intro="Export a WhatsApp conversation as a plain-text file, then upload it on the analysis page."
      steps={[
        {
          title: "Open the chat",
          description: "Tap on the specific individual or group chat you want to export.",
        },
        {
          title: "Access settings",
          variants: [
            {
              label: "Android",
              description: "Tap the three dots (menu) in the top-right corner, then tap More.",
            },
            {
              label: "iPhone",
              description: "Tap the contact or group name at the top of your screen.",
            },
          ],
        },
        {
          title: "Export",
          description: "Tap Export chat.",
        },
        {
          title: "Choose media",
          description:
            "Select whether you want to Include media (photos/videos) or export Without media (text only).",
          highlight:
            "Choose “Without media” — Gabriel only needs the text, and it keeps the export small and fast to upload.",
        },
        {
          title: "Save or share",
          description:
            "Choose a method to send or save the file (e.g., save it to your Files, or send it to yourself via Email).",
        },
      ]}
    />
  );
}
