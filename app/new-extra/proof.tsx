import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { colors, spacing, typography, radii } from "@/theme/theme";
import { TextField, PrimaryButton, Card, SectionLabel } from "@/components/ui";
import { useNewExtra, DraftPhoto } from "@/state/NewExtraContext";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function compressImage(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1400 } }], {
      compress: 0.68,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    return uri;
  }
}

export default function ProofStep() {
  const router = useRouter();
  const { draft, updateDraft, movePhoto } = useNewExtra();
  const [busy, setBusy] = useState(false);

  const addFromCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Camera permission needed",
          "Allow camera access in your device settings to photograph the extra work. You can still add existing photos from your library."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) return;
      setBusy(true);
      const compressed = await compressImage(result.assets[0].uri);
      const photo: DraftPhoto = {
        localId: uid(),
        uri: compressed,
        caption: "",
        takenAt: new Date().toISOString(),
      };
      updateDraft({ photos: [...draft.photos, photo] });
    } catch (e: any) {
      Alert.alert("Couldn't take photo", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const addFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow photo library access in your device settings to attach existing photos. You can still take a new photo with the camera."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      setBusy(true);
      const newPhotos: DraftPhoto[] = [];
      for (const asset of result.assets) {
        try {
          const compressed = await compressImage(asset.uri);
          newPhotos.push({
            localId: uid(),
            uri: compressed,
            caption: "",
            takenAt: new Date().toISOString(),
          });
        } catch {
          // Skip one unreadable photo instead of failing the entire selection.
        }
      }
      if (newPhotos.length === 0) {
        Alert.alert("Couldn't add photos", "None of the selected photos could be read. Please try again.");
      } else {
        updateDraft({ photos: [...draft.photos, ...newPhotos] });
      }
    } catch (e: any) {
      Alert.alert("Couldn't open photo library", e?.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = (localId: string) =>
    updateDraft({ photos: draft.photos.filter((p) => p.localId !== localId) });

  const setCaption = (localId: string, caption: string) =>
    updateDraft({
      photos: draft.photos.map((p) => (p.localId === localId ? { ...p, caption } : p)),
    });

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={typography.h1}>Add proof</Text>
        <Text style={styles.stepLabel}>Step 4 of 5 · Photos are optional, but they make approval easier.</Text>

        <View style={styles.photoButtons}>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Take Photo" onPress={addFromCamera} variant="secondary" loading={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton title="Photo Library" onPress={addFromLibrary} variant="secondary" loading={busy} />
          </View>
        </View>

        {draft.photos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No photos added yet</Text>
            <Text style={styles.emptyBody}>
              Useful proof includes the requested area, before/after photos, installed materials, or completed extra work.
            </Text>
          </Card>
        ) : (
          <View style={styles.photoList}>
            <Text style={styles.photoCount}>{draft.photos.length} photo{draft.photos.length === 1 ? "" : "s"} attached</Text>
            {draft.photos.map((p, index) => (
              <Card key={p.localId} style={styles.photoCard}>
                <Image
                  source={{ uri: p.uri }}
                  style={styles.photo}
                  onError={() => Alert.alert("Photo unavailable", "This photo can no longer be read. Remove it and add it again.")}
                />
                <View style={{ flex: 1 }}>
                  <TextField
                    placeholder="Caption (optional)"
                    value={p.caption}
                    onChangeText={(t) => setCaption(p.localId, t)}
                  />
                  <View style={styles.photoActionsRow}>
                    <Pressable onPress={() => movePhoto(index, index - 1)} disabled={index === 0} hitSlop={8}>
                      <Text style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}>Move up</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => movePhoto(index, index + 1)}
                      disabled={index === draft.photos.length - 1}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.reorderBtn,
                          index === draft.photos.length - 1 && styles.reorderBtnDisabled,
                        ]}
                      >
                        Move down
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => removePhoto(p.localId)} hitSlop={8}>
                      <Text style={styles.removeBtn}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <Card style={{ marginTop: spacing.lg }}>
          <SectionLabel>Site notes (optional)</SectionLabel>
          <TextField
            value={draft.siteNotes}
            onChangeText={(t) => updateDraft({ siteNotes: t })}
            multiline
            numberOfLines={3}
            placeholder="Anything the approver should know about the site condition or work completed..."
            style={{ minHeight: 92, textAlignVertical: "top" }}
          />
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <PrimaryButton title="Continue to Review" onPress={() => router.push("/new-extra/review")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  stepLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  photoButtons: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  emptyCard: { marginTop: spacing.lg },
  emptyTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  emptyBody: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  photoList: { marginTop: spacing.lg, gap: spacing.md },
  photoCount: { ...typography.captionStrong, color: colors.textSecondary },
  photoCard: { flexDirection: "row", gap: spacing.md },
  photo: { width: 92, height: 92, borderRadius: radii.md, backgroundColor: colors.bg },
  photoActionsRow: { flexDirection: "row", gap: spacing.md, marginTop: 4, alignItems: "center", flexWrap: "wrap" },
  reorderBtn: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  reorderBtnDisabled: { color: colors.textMuted },
  removeBtn: { color: colors.danger, fontWeight: "600", fontSize: 13 },
});
