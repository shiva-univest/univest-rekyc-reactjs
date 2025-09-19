import React from "react";
import loaderGif from "../../assets/loader.gif";
import "./VerificationLoader.css";

const VerificationLoader = ({ isVisible = true }) => {
  if (!isVisible) return null;

  return (
    <div className="verification-loader-overlay">
      <div className="verification-loader-container">
        <img
          src={loaderGif}
          alt="Verifying details..."
          className="verification-loader-gif"
        />
      </div>
    </div>
  );
};

export default VerificationLoader;