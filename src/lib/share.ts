import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

export async function sharePdf(uri: string, dialogTitle = "Share Change Order"): Promise<void> {
  let available = false;
  try {
    available = await Sharing.isAvailableAsync();
  } catch {
    available = false;
  }

  if (!available) {
    Alert.alert(
      "Sharing unavailable",
      "Sharing isn't available on this device right now. The PDF has been saved in the app's documents folder and you can try sharing again from the change order detail screen."
    );
    return;
  }

  try {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle, UTI: "com.adobe.pdf" });
  } catch (e: any) {
    Alert.alert(
      "Couldn't open the share sheet",
      "The PDF was generated successfully and saved in the app's documents folder, but sharing failed. Please try again."
    );
  }
}
