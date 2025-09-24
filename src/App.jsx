import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import Congratulation from "./pages/Congratulation";
import Segment from "./pages/Segment";
import Activatebank from "./pages/Activatebank";
import NotFound from "./pages/RequestFailed";
import withAuthCheck from "./hoc/withAuthCheck";
import BankaccAccount from "./pages/Add_bankaccount";
import { SegmentProvider } from "./context/SegmentContext";
import Bank from "./pages/Bankaccount";
import BankaccAccountComplete from "./pages/Bankaccountcomplete";
import Pennycompo from "./pages/ifsc/pennydrop";
import "./App.css";
import ActivateDDPI from "./pages/DDPI";
import BrokerDetails from "./pages/BrokerAccountDetails/broker";
import ProfileCard from "./pages/PersonalInfo/personalinfo";
import PersonalInfoForm from "./pages/PersonalEdit/personaledit";
import EditContactModal from "./pages/PersonalInfo/EditContactModal";
import EditContactPhone from "./pages/PersonalInfo/EditContactPhone";
import Esign from "./pages/Esign/Esign";
import Nominee from "./pages/Nominee/Nominee";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProtectedSegment = withAuthCheck(Segment);

const App = () => {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/congratulations",
      element: <Congratulation />,
    },
    {
      path: "/segment",
      element: <ProtectedSegment />,
    },
    {
      path: "/activatebank",
      element: <Activatebank />,
    },
    {
      path: "/notfound",
      element: <NotFound />,
    },
    {
      path: "*",
      element: <NotFound />,
    },
    {
      path: "/bank",
      element: <Bank />,
    },
    {
      path: "/bankaccount",
      element: <BankaccAccount />,
    },
    {
      path: "/bankaccountcomplete",
      element: <BankaccAccountComplete />,
    },
    {
      path: "/pennydrop",
      element: <Pennycompo />,
    },
    {
      path: "/activateddpi",
      element: <ActivateDDPI />,
    },
    {
      path: "/brokerdetails",
      element: <BrokerDetails />,
    },
    {
      path: "/personalinfo",
      element: <ProfileCard />,
    },
    {
      path: "/personaledit",
      element: <PersonalInfoForm />,
    },
    {
      path: "/editpersonalemail",
      element: <EditContactModal />,
    },
    {
      path: "/editpersonalemailphone",
      element: <EditContactPhone />,
    },
    {
      path: "/esign",
      element: <Esign />,
    },
    {
      path: "/nominee",
      element: <Nominee />,
    },
  ]);

  return (
    <>
      <SegmentProvider>
        <RouterProvider router={router} />
      </SegmentProvider>

      {/* Toast container should be inside root */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="light"
      />
    </>
  );
};

export default App;
