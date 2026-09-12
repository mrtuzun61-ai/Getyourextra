import { Alert } from "react-native";

/**
 * Shows a native confirm/cancel dialog and resolves true only if the user
 * confirmed. Used everywhere a destructive or hard-to-reverse action happens
 * (archive job, reset an approval, mark paid, replace a signature) so the
 * confirmation pattern stays consistent across the whole app.
 */
export function confirmAction(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        {
          text: opts.confirmLabel ?? "Confirm",
          style: opts.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

export function showError(title: string, message: string): void {
  Alert.alert(title, message);
}
