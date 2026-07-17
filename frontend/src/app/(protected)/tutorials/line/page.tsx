import { TutorialPage } from "@/components/TutorialPage";

export default function LineTutorialPage() {
  return (
    <TutorialPage
      platformLabel="LINE"
      icon="chat_bubble"
      intro="Export a LINE conversation as a plain-text file, then upload it on the analysis page."
      steps={[
        {
          title: "Open the chat",
          description: "Open the conversation you want to export.",
        },
        {
          title: "Access settings",
          description:
            "Tap the menu icon (three lines or a drop-down arrow) in the top-right corner of the chat.",
        },
        {
          title: "Tap settings",
          description: "Select Other settings.",
        },
        {
          title: "Export",
          description: "Tap Export chat history.",
        },
        {
          title: "Save or share",
          description:
            "Choose how you want to send the file. You can email it to yourself, upload it to Google Drive/iCloud, or send it to another chat.",
        },
      ]}
    />
  );
}
