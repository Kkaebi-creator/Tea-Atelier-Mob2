import React, { useState } from "react";
import { IonAlert, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonText, IonTitle, IonToolbar, IonSpinner } from "@ionic/react";
import { logOutOutline, personCircleOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import MobileTabBar from "../components/MobileTabBar";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";

const AccountPage: React.FC = () => {
  const { user, token, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("profile");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [addresses, setAddresses] = useState<{ address_id: string; address_line1: string; address_line2: string | null; address_line3: string | null }[]>([]);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [addressError, setAddressError] = useState("");
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const loadAddresses = async () => {
    if (!token) return;
    const response = await fetch(`${API_URL}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok) setAddresses((await response.json()).addresses);
  };

  React.useEffect(() => { loadAddresses(); }, [token]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const saveProfile = async () => {
    if (!token) return;
    setIsSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, phoneNumber: phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save profile.");
      updateUser(data.user);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const addAddress = async () => {
    if (!token || !addressLine1.trim()) { setAddressError("Address line 1 is required."); return; }
    setAddressError("");
    const response = await fetch(`${API_URL}/api/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ addressLine1, addressLine2, addressLine3 }),
    });
    if (!response.ok) { setAddressError((await response.json()).error || "Unable to save address."); return; }
    setAddressLine1(""); setAddressLine2(""); setAddressLine3(""); await loadAddresses();
  };

  const deleteAddress = async () => {
    if (!token || !addressToDelete) return;
    await fetch(`${API_URL}/api/addresses/${addressToDelete}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setAddressToDelete(null);
    await loadAddresses();
  };

  return (
    <IonPage className="tea-account-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <div className="tea-account-hero">
            <IonIcon icon={personCircleOutline} />
            <div>
              <p className="tea-account-name">{user?.name || "Tea customer"}</p>
              <p className="tea-account-email">{user?.email || "Signed in customer"}</p>
            </div>
          </div>
          <IonSegment value={section} onIonChange={(event) => setSection(event.detail.value as string)} className="tea-account-segment">
            <IonSegmentButton value="profile"><IonLabel>Profile</IonLabel></IonSegmentButton>
            <IonSegmentButton value="orders"><IonLabel>Orders</IonLabel></IonSegmentButton>
            <IonSegmentButton value="settings"><IonLabel>Settings</IonLabel></IonSegmentButton>
          </IonSegment>

          {section === "profile" && (
            <div className="tea-account-panel">
              <h2>Profile details</h2>
              <p className="tea-panel-copy">Keep your delivery information up to date.</p>
              <IonItem><IonLabel position="stacked">First name</IonLabel><IonInput value={firstName} onIonChange={(e) => setFirstName(e.detail.value || "")} /></IonItem>
              <IonItem><IonLabel position="stacked">Last name</IonLabel><IonInput value={lastName} onIonChange={(e) => setLastName(e.detail.value || "")} /></IonItem>
              <IonItem><IonLabel position="stacked">Phone</IonLabel><IonInput type="tel" value={phone} onIonChange={(e) => setPhone(e.detail.value || "")} /></IonItem>
              <IonItem><IonLabel position="stacked">Email</IonLabel><IonInput value={user?.email || ""} readonly /></IonItem>
              <IonButton expand="block" onClick={saveProfile} disabled={isSaving}>{isSaving ? <IonSpinner name="crescent" /> : "Save profile"}</IonButton>
              {message && <IonText color="success"><p>{message}</p></IonText>}
              <h2 className="tea-account-subheading">Saved addresses</h2>
              {addresses.map((address) => <div className="tea-address-row" key={address.address_id}><span>{[address.address_line1, address.address_line2, address.address_line3].filter(Boolean).join(", ")}</span><IonButton fill="clear" color="danger" onClick={() => setAddressToDelete(address.address_id)}>Remove</IonButton></div>)}
              <IonItem><IonLabel position="stacked">Address line 1</IonLabel><IonInput value={addressLine1} onIonChange={(e) => setAddressLine1(e.detail.value || "")} placeholder="House number and street" /></IonItem>
              <IonItem><IonLabel position="stacked">City / municipality</IonLabel><IonInput value={addressLine2} onIonChange={(e) => setAddressLine2(e.detail.value || "")} /></IonItem>
              <IonItem><IonLabel position="stacked">Province</IonLabel><IonInput value={addressLine3} onIonChange={(e) => setAddressLine3(e.detail.value || "")} /></IonItem>
              <IonButton expand="block" fill="outline" onClick={addAddress}>Add address</IonButton>
              {addressError && <IonText color="danger"><p>{addressError}</p></IonText>}
            </div>
          )}

          {section === "orders" && (
            <div className="tea-account-panel">
              <h2>Order history</h2>
              <p className="tea-panel-copy">Track your recent Tea Atelier purchases.</p>
              <IonButton expand="block" onClick={() => navigate("/orders")}>View order history</IonButton>
            </div>
          )}

          {section === "settings" && (
            <div className="tea-account-panel">
              <h2>Settings</h2>
              <IonList className="tea-account-list">
                <IonItem lines="none"><IonLabel><h2>Order updates</h2><p>Receive updates about your orders</p></IonLabel><input className="tea-toggle" type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} /></IonItem>
                <IonItem lines="none" button onClick={handleLogout}><IonIcon icon={logOutOutline} slot="start" color="danger" /><IonLabel color="danger">Sign out</IonLabel></IonItem>
              </IonList>
            </div>
          )}
          <IonButton expand="block" fill="outline" routerLink="/shop">Continue shopping</IonButton>
        </div>
      </IonContent>
      <IonAlert isOpen={Boolean(addressToDelete)} header="Remove address?" message="This saved address will be removed from your account." buttons={[{ text: "Cancel", role: "cancel", handler: () => setAddressToDelete(null) }, { text: "Remove", role: "destructive", handler: deleteAddress }]} onDidDismiss={() => setAddressToDelete(null)} />
      <MobileTabBar />
    </IonPage>
  );
};

export default AccountPage;
