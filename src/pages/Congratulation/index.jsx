import React from "react";
import { useLocation } from "react-router-dom"; // ✅ import useLocation
import "./styles.css";

const Congratulation = () => {
  const location = useLocation();
  const fromPersonalInfo = location.state?.from === "personalInfo"; // check state

  return (
    <div>
      <div className="upper_main">
        <img src="./91001-success 1.svg" alt="success" />
        <p className="c_congratulations">Congratulations!</p>
        <p className="c_request">
          {fromPersonalInfo
            ? "Details updated successfully"
            : "Request submitted successfully"}
        </p>
      </div>
      <footer className="conFooter">
        <a
          href="https://univest.page.link/APPHOME"
          target="_blank"
          rel="noopener noreferrer"
        >
          <button className="c_alright">Alright</button>
        </a>
      </footer>
    </div>
  );
};

export default Congratulation;
