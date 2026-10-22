import PageFrame from "../components/PageFrame";
import PageIntro from "../components/PageIntro";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IonAlert,
  IonActionSheet,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { cameraOutline, trashOutline, createOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";
import TeaLoader from "../components/TeaLoader";
import { ensureOk, fetchApi, requestError } from "../config/request";
import ProfileAvatar from "../components/ProfileAvatar";
import SignOutControl from "../components/SignOutControl";
import { mediaUrl } from "../config/media";
import "../theme/profile-checkout.css";

type ProfileFields = { firstName: string; lastName: string; phone: string };
const profileFields = (
  user: { firstName?: string; lastName?: string; phone?: string | null } | null,
): ProfileFields => ({
  firstName: user?.firstName || "",
  lastName: user?.lastName || "",
  phone: user?.phone || "",
});
const sameProfile = (a: ProfileFields, b: ProfileFields) =>
  a.firstName === b.firstName &&
  a.lastName === b.lastName &&
  a.phone === b.phone;
const mobileNumber = (value: string) => {
  const compact = value.trim().replace(/[\s()-]/g, "");
  if (/^(?:\+63|63)9\d{9}$/.test(compact))
    return `0${compact.slice(compact.startsWith("+") ? 3 : 2)}`;
  return compact;
};

const AccountPage: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");
  const [profile, setProfile] = useState<ProfileFields>(() =>
    profileFields(user),
  );
  const profileRef = useRef(profile);
  const previousProfile = useRef({ token, fields: profileFields(user) });
  const savePending = useRef(false);
  const epoch = useRef(0);
  const latestToken = useRef(token);
  latestToken.current = token;
  const [message, setMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoAction, setPhotoAction] = useState<"upload" | "remove" | null>(
    null,
  );
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const isBusy = isSaving || photoAction !== null;
  const hasProfileChanges = !sameProfile(profile, profileFields(user));

  useEffect(() => {
    const sessionEpoch = ++epoch.current;
    savePending.current = false;
    setIsSaving(false);
    setPhotoAction(null);
    setPhotoEditorOpen(false);
    setPhotoError("");
    setPhotoMessage("");
    setMessage("");
    setProfileError("");
    return () => {
      epoch.current = sessionEpoch + 1;
    };
  }, [token]);

  useEffect(() => {
    const next = {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      phone: user?.phone || "",
    };
    const previous = previousProfile.current;
    if (
      previous.token !== token ||
      sameProfile(profileRef.current, previous.fields)
    ) {
      profileRef.current = next;
      setProfile(next);
    }
    previousProfile.current = { token, fields: next };
  }, [token, user?.firstName, user?.lastName, user?.phone]);

  const editProfile = (field: keyof ProfileFields, value: string) => {
    const next = { ...profileRef.current, [field]: value };
    profileRef.current = next;
    setProfile(next);
    setMessage("");
    setProfileError("");
  };
  const [addresses, setAddresses] = useState<
    {
      address_id: string;
      address_line1: string;
      address_line2: string | null;
      address_line3: string | null;
    }[]
  >([]);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!token) return;
    const current = epoch.current;
    try {
      const response = await fetchApi(`${API_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await ensureOk(response, "Unable to load saved addresses.");
      const data = await response.json();
      if (!Array.isArray(data?.addresses))
        throw new Error("Unable to load saved addresses.");
      if (current === epoch.current && latestToken.current === token)
        setAddresses(data.addresses);
    } catch (failure) {
      if (current === epoch.current && latestToken.current === token)
        setAddressError(
          requestError(failure, "Unable to load saved addresses."),
        );
    }
  }, [token]);

  useEffect(() => {
    setAddresses([]);
    setAddressError("");
    void loadAddresses();
  }, [loadAddresses]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savePending.current) return;
    setMessage("");
    setProfileError("");
    if (!token) {
      setProfileError("Sign in again to save your profile.");
      return;
    }
    const draft = profileRef.current;
    const submitted = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: mobileNumber(draft.phone),
    };
    if (
      ![submitted.firstName, submitted.lastName].every(
        (value) => value.length > 0 && value.length <= 50,
      )
    ) {
      setProfileError(
        "First and last name must each contain 1 to 50 characters.",
      );
      return;
    }
    if (draft.phone.trim() && !/^09\d{9}$/.test(submitted.phone)) {
      setProfileError(
        "Enter an 11-digit mobile number starting with 09, or its +639 equivalent.",
      );
      return;
    }
    savePending.current = true;
    setIsSaving(true);
    const current = epoch.current;
    try {
      const response = await fetchApi(`${API_URL}/api/user`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: submitted.firstName,
          lastName: submitted.lastName,
          phoneNumber: submitted.phone,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to save profile. Please try again.",
        );
      }
      const saved = data?.user;
      if (
        !saved ||
        saved.firstName !== submitted.firstName ||
        saved.lastName !== submitted.lastName ||
        !(typeof saved.phone === "string" || saved.phone === null) ||
        (saved.phone || "") !== submitted.phone
      ) {
        throw new Error(
          "We couldn't confirm your saved details. Your changes are still in the form. Please try again.",
        );
      }
      if (current !== epoch.current || latestToken.current !== token) return;
      const confirmed = {
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone || "",
      };
      profileRef.current = confirmed;
      setProfile(confirmed);
      updateUser({
        ...confirmed,
        phone: saved.phone || null,
        name: `${saved.firstName} ${saved.lastName}`,
      });
      setMessage("Profile saved.");
    } catch (failure) {
      if (current === epoch.current && latestToken.current === token) {
        setProfileError(requestError(failure, "Unable to save profile."));
      }
    } finally {
      if (current === epoch.current && latestToken.current === token) {
        savePending.current = false;
        setIsSaving(false);
      }
    }
  };

  const savePhoto = async (file: File | null) => {
    if (savePending.current) return;
    setPhotoError("");
    setPhotoMessage("");
    if (!token) {
      setPhotoError("Sign in again to change your photo.");
      return;
    }
    if (file && !["image/jpeg", "image/png"].includes(file.type)) {
      setPhotoError("Choose a JPG or PNG image.");
      return;
    }
    if (file && (file.size === 0 || file.size > 5 * 1024 * 1024)) {
      setPhotoError(
        file.size === 0
          ? "This image is empty. Choose another photo."
          : "Choose an image no larger than 5 MB.",
      );
      return;
    }
    savePending.current = true;
    setPhotoAction(file ? "upload" : "remove");
    const current = epoch.current;
    const isCurrent = () =>
      current === epoch.current && latestToken.current === token;
    try {
      let avatarUrl: string | null = null;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        const upload = await fetchApi(`${API_URL}/api/user/avatar-upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        });
        await ensureOk(upload, "Unable to upload photo. Please try again.");
        const data = await upload.json().catch(() => null);
        if (
          typeof data?.url !== "string" ||
          !/^https?:\/\//i.test(data.url) ||
          !mediaUrl(data.url)
        )
          throw new Error(
            "The upload didn't return a valid photo. Please try again.",
          );
        avatarUrl = data.url;
      }
      if (!isCurrent()) return;
      const response = await fetchApi(`${API_URL}/api/user`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarUrl }),
      });
      await ensureOk(response, "Unable to save your photo. Please try again.");
      const data = await response.json().catch(() => null);
      if (!data?.user || data.user.avatarUrl !== avatarUrl)
        throw new Error(
          "We couldn't confirm your photo was saved. Please try again.",
        );
      if (!isCurrent()) return;
      updateUser({ avatarUrl });
      setPhotoMessage(
        file ? "Profile photo updated." : "Profile photo removed.",
      );
    } catch (failure) {
      if (isCurrent())
        setPhotoError(requestError(failure, "Unable to save your photo."));
    } finally {
      if (isCurrent()) {
        savePending.current = false;
        setPhotoAction(null);
      }
    }
  };

  const addAddress = async () => {
    if (!token || !addressLine1.trim()) {
      setAddressError("Address line 1 is required.");
      return;
    }
    setAddressError("");
    const response = await fetch(`${API_URL}/api/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ addressLine1, addressLine2, addressLine3 }),
    });
    if (!response.ok) {
      setAddressError(
        (await response.json()).error || "Unable to save address.",
      );
      return;
    }
    setAddressLine1("");
    setAddressLine2("");
    setAddressLine3("");
    await loadAddresses();
  };

  const deleteAddress = async () => {
    if (!token || !addressToDelete) return;
    await fetch(`${API_URL}/api/addresses/${addressToDelete}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setAddressToDelete(null);
    await loadAddresses();
  };

  return (
    <PageFrame embedded={embedded} className="tea-account-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <PageIntro
            eyebrow="Your atelier"
            title="Make yourself at home."
            description="Your details, saved addresses, and little preferences."
          />
          <div className="tea-account-hero">
            <button
              type="button"
              className="tea-profile-photo-trigger"
              aria-label="Edit profile photo"
              aria-busy={photoAction !== null}
              disabled={isBusy}
              onClick={() => setPhotoEditorOpen(true)}
            >
              <ProfileAvatar
                name={user?.name || "Tea customer"}
                src={user?.avatarUrl}
                className="tea-account-avatar"
              />
              <span className="tea-profile-photo-pencil" aria-hidden="true">
                <IonIcon icon={createOutline} />
              </span>
            </button>
            <div className="tea-account-identity">
              <p className="tea-account-name">{user?.name || "Tea customer"}</p>
              <p className="tea-account-email">
                {user?.email || "Signed in customer"}
              </p>
              {photoAction && (
                <TeaLoader
                  label={
                    photoAction === "upload"
                      ? "Uploading photo…"
                      : "Removing photo…"
                  }
                />
              )}
            </div>
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png"
            aria-label="Choose profile photo"
            hidden
            disabled={isBusy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) void savePhoto(file);
            }}
          />
          {photoMessage && (
            <IonText color="success">
              <p role="status" className="tea-profile-photo-feedback">
                {photoMessage}
              </p>
            </IonText>
          )}
          {photoError && (
            <IonText color="danger">
              <p role="alert" className="tea-profile-photo-feedback">
                {photoError}
              </p>
            </IonText>
          )}
          <IonActionSheet
            isOpen={photoEditorOpen}
            className="tea-profile-photo-sheet"
            header="Profile photo"
            subHeader="JPG or PNG, up to 5 MB. Changes save automatically."
            onDidDismiss={() => setPhotoEditorOpen(false)}
            buttons={[
              {
                text: user?.avatarUrl ? "Change photo" : "Add photo",
                icon: cameraOutline,
                handler: () => {
                  photoInput.current?.click();
                },
              },
              ...(user?.avatarUrl
                ? [
                    {
                      text: "Remove photo",
                      role: "destructive",
                      icon: trashOutline,
                      handler: () => {
                        void savePhoto(null);
                      },
                    },
                  ]
                : []),
              { text: "Cancel", role: "cancel" },
            ]}
          />
          <IonSegment
            value={section}
            onIonChange={(event) => setSection(event.detail.value as string)}
            className="tea-account-segment"
          >
            <IonSegmentButton value="profile">
              <IonLabel>Profile</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="orders">
              <IonLabel>Orders</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="settings">
              <IonLabel>Settings</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {section === "profile" && (
            <div className="tea-account-panel">
              <form
                onSubmit={saveProfile}
                aria-label="Profile details"
                className="tea-profile-form"
              >
                <h2>Profile details</h2>
                <p className="tea-panel-copy">
                  Keep your delivery information up to date.
                </p>
                <div className="tea-field">
                  <IonInput
                    label="First name"
                    labelPlacement="stacked"
                    value={profile.firstName}
                    autocomplete="given-name"
                    disabled={isBusy}
                    onIonInput={(e) =>
                      editProfile("firstName", e.detail.value || "")
                    }
                  />
                </div>
                <div className="tea-field">
                  <IonInput
                    label="Last name"
                    labelPlacement="stacked"
                    value={profile.lastName}
                    autocomplete="family-name"
                    disabled={isBusy}
                    onIonInput={(e) =>
                      editProfile("lastName", e.detail.value || "")
                    }
                  />
                </div>
                <div className="tea-field">
                  <IonInput
                    label="Phone"
                    labelPlacement="stacked"
                    type="tel"
                    value={profile.phone}
                    autocomplete="tel"
                    placeholder="09XXXXXXXXX"
                    helperText="Optional. Use 09XXXXXXXXX or +639XXXXXXXXX."
                    disabled={isBusy}
                    onIonInput={(e) =>
                      editProfile("phone", e.detail.value || "")
                    }
                  />
                </div>
                <div className="tea-field">
                  <IonInput
                    label="Email"
                    labelPlacement="stacked"
                    value={user?.email || ""}
                    readonly
                  />
                </div>
                <IonButton
                  expand="block"
                  type="submit"
                  disabled={isBusy || !hasProfileChanges}
                >
                  {isSaving ? <TeaLoader /> : "Save profile"}
                </IonButton>
                {message && (
                  <IonText color="success">
                    <p role="status">{message}</p>
                  </IonText>
                )}
                {profileError && (
                  <IonText color="danger">
                    <p role="alert">{profileError}</p>
                  </IonText>
                )}
              </form>
              <h2 className="tea-account-subheading">Saved addresses</h2>
              {addresses.map((address) => (
                <div className="tea-address-row" key={address.address_id}>
                  <span>
                    {[
                      address.address_line1,
                      address.address_line2,
                      address.address_line3,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={() => setAddressToDelete(address.address_id)}
                  >
                    Remove
                  </IonButton>
                </div>
              ))}
              <div className="tea-field">
                <IonInput
                  label="Address line 1"
                  labelPlacement="stacked"
                  value={addressLine1}
                  onIonInput={(e) => setAddressLine1(e.detail.value || "")}
                  placeholder="House number and street"
                />
              </div>
              <div className="tea-field">
                <IonInput
                  label="City / municipality"
                  labelPlacement="stacked"
                  value={addressLine2}
                  onIonInput={(e) => setAddressLine2(e.detail.value || "")}
                />
              </div>
              <div className="tea-field">
                <IonInput
                  label="Province"
                  labelPlacement="stacked"
                  value={addressLine3}
                  onIonInput={(e) => setAddressLine3(e.detail.value || "")}
                />
              </div>
              <IonButton expand="block" fill="outline" onClick={addAddress}>
                Add address
              </IonButton>
              {addressError && (
                <IonText color="danger">
                  <p role="alert">{addressError}</p>
                </IonText>
              )}
            </div>
          )}

          {section === "orders" && (
            <div className="tea-account-panel">
              <h2>Order history</h2>
              <p className="tea-panel-copy">
                Track your recent Tea Atelier purchases.
              </p>
              <IonButton expand="block" onClick={() => navigate("/orders")}>
                View order history
              </IonButton>
            </div>
          )}

          {section === "settings" && (
            <div className="tea-account-panel">
              <h2>Settings</h2>
              <IonList className="tea-account-list">
                <IonItem lines="none" button routerLink="/notifications">
                  <IonLabel>
                    <h2>Order updates</h2>
                    <p>View order progression and notifications</p>
                  </IonLabel>
                </IonItem>
                <IonItem lines="none" button routerLink="/settings">
                  <IonLabel>
                    <h2>Security settings</h2>
                    <p>Email verification and two-factor authentication</p>
                  </IonLabel>
                </IonItem>
                <SignOutControl asItem />
              </IonList>
            </div>
          )}
          <IonButton expand="block" fill="outline" routerLink="/shop">
            Continue shopping
          </IonButton>
        </div>
      </IonContent>
      <IonAlert
        isOpen={Boolean(addressToDelete)}
        header="Remove address?"
        message="This saved address will be removed from your account."
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => setAddressToDelete(null),
          },
          { text: "Remove", role: "destructive", handler: deleteAddress },
        ]}
        onDidDismiss={() => setAddressToDelete(null)}
      />
    </PageFrame>
  );
};

export default AccountPage;
