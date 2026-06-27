import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";

const getGoogleProfile = (credential) => {
  const payload = credential.split(".")[1];
  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const decodedPayload = decodeURIComponent(
    atob(normalizedPayload)
      .split("")
      .map((character) => {
        return `%${`00${character.charCodeAt(0).toString(16)}`.slice(-2)}`;
      })
      .join(""),
  );
  const profile = JSON.parse(decodedPayload);

  return {
    firstName: profile.given_name || profile.name?.split(" ")[0] || "user",
  };
};

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const handleGoogleSuccess = (credentialResponse) => {
    const user = getGoogleProfile(credentialResponse.credential);
    onLogin(user);
    navigate("/", { replace: true });
  };

  const handleGoogleError = () => {
    console.error("Google login failed");
  };

  return (
    <div className="login-page-container">
      <section className="card login-card">
        <div>
          <p className="tiny-label">Welcome back</p>
          <h2>Access AdaptFit</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            width="100%"
          />
        </div>
      </section>
    </div>
  );
}
