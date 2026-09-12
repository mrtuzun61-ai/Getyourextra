import React, { useState } from "react";
import { ScrollView, Alert, KeyboardAvoidingView, Platform, Text } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, typography } from "@/theme/theme";
import { TextField, PrimaryButton, Card, SectionLabel } from "@/components/ui";
import { createJob, getJobById, updateJob } from "@/db/repositories/jobRepo";
import { useNewExtra } from "@/state/NewExtraContext";

export default function NewOrEditJob() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string; returnToNewExtra?: string }>();
  const existing = params.editId ? getJobById(params.editId) : null;
  const { updateDraft } = useNewExtra();

  const [name, setName] = useState(existing?.name ?? "");
  const [customerName, setCustomerName] = useState(existing?.customerName ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [contactName, setContactName] = useState(existing?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(existing?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(existing?.contactEmail ?? "");
  const [gcName, setGcName] = useState(existing?.gcName ?? "");
  const [projectNumber, setProjectNumber] = useState(existing?.projectNumber ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSave = () => {
    if (!name.trim()) {
      setNameError("Job name is required.");
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        updateJob(existing.id, {
          name: name.trim(),
          customerName: customerName.trim(),
          address: address.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          gcName: gcName.trim(),
          projectNumber: projectNumber?.trim() || null,
          notes: notes?.trim() || null,
        });
        router.back();
      } else {
        const job = createJob({
          name: name.trim(),
          customerName: customerName.trim(),
          address: address.trim(),
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim(),
          contactEmail: contactEmail.trim(),
          gcName: gcName.trim(),
          projectNumber: projectNumber?.trim() || null,
          startDate: null,
          notes: notes?.trim() || null,
        });
        if (params.returnToNewExtra === "1") {
          updateDraft({ jobId: job.id });
          router.replace("/new-extra/details");
        } else {
          router.replace(`/(tabs)/jobs/${job.id}`);
        }
      }
    } catch (e: any) {
      Alert.alert("Couldn't save job", e?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Text style={typography.h1}>{existing ? "Edit Job" : "New Job"}</Text>
          <Card style={{ marginTop: spacing.lg }}>
            <SectionLabel>Job</SectionLabel>
            <TextField
              label="Job name"
              required
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameError) setNameError(undefined);
              }}
              placeholder="Smith Residence Renovation"
              error={nameError}
            />
            <TextField label="Customer / company" value={customerName} onChangeText={setCustomerName} placeholder="ABC General Contracting" />
            <TextField label="Project address" value={address} onChangeText={setAddress} placeholder="115 Oak Street, Tampa, FL" />
            <TextField label="General contractor / company" value={gcName} onChangeText={setGcName} />
            <TextField label="Project number" value={projectNumber ?? ""} onChangeText={setProjectNumber} />
          </Card>
          <Card style={{ marginTop: spacing.lg }}>
            <SectionLabel>Site contact</SectionLabel>
            <TextField label="Contact name" value={contactName} onChangeText={setContactName} placeholder="John Miller" />
            <TextField label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
            <TextField label="Contact email" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />
          </Card>
          <Card style={{ marginTop: spacing.lg }}>
            <SectionLabel>Notes</SectionLabel>
            <TextField value={notes ?? ""} onChangeText={setNotes} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: "top" }} />
          </Card>
          <PrimaryButton title={saving ? "Saving..." : existing ? "Save Changes" : "Create Job"} onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
