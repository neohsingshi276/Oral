// ============================================
// src/pages/HomePage.jsx — Malaysian Theme + Full BM
// ============================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import heroImage from "../assets/child.png";
import stephaniePhoto from '../assets/STEPHANIE.jpeg';
import ruhayaPhoto from '../assets/DR. RUHAYA.jpeg';
import norkhafizahPhoto from '../assets/ASSOCIATE PROFESSOR DR. NORKHAFIZAH.jpeg';
import punamPhoto from '../assets/Punam.jpg';
import neohPhoto from '../assets/Neoh.jpeg';
import suziPhoto from '../assets/Suzi.jpg';
import { useLanguage } from "../context/LanguageContext";

const HomePage = () => {
  const { t, language } = useLanguage();
  const featureCards = t("home.cards");
  const navigate = useNavigate();
  const [showLearningPopup, setShowLearningPopup] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const handleLearningZoneClick = (event) => {
    event.preventDefault();
    setShowLearningPopup(true);
  };

  const handleLearningYes = () => {
    setShowLearningPopup(false);
    navigate("/learning");
  };

  const handleLearningNo = () => {
    setShowLearningPopup(false);
    navigate("/join");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

        .homepage-container {
          min-height: 100vh;
          background-color: #FFF9F0;
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #1a1a2e;
          overflow: hidden;
          position: relative;
        }

        .bg-shape {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.5;
        }

        .bg-shape-1 {
          top: -10%;
          left: -5%;
          width: 500px;
          height: 500px;
          background: linear-gradient(135deg, #01306B, #1e5aad);
        }

        .bg-shape-2 {
          top: 30%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, #D4A843, #FFD700);
        }

        .bg-shape-3 {
          bottom: -20%;
          left: 20%;
          width: 800px;
          height: 800px;
          background: linear-gradient(135deg, #01306B, #2563eb);
          opacity: 0.3;
        }

        .homepage-main {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 6rem;
        }

        .hero-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4rem;
          min-height: 75vh;
          margin-top: 0;
        }

        .hero-content {
          flex: 1;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          animation: slideUp 0.8s ease-out forwards;
          transform: translateY(-35px);
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(212,168,67,0.3);
          width: fit-content;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          font-weight: 600;
          color: #01306B;
          font-size: 0.9rem;
        }

        .hero-title {
          font-size: 6rem;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
          margin: 0;
          color: #01306B;
        }

        .text-gradient {
          background: linear-gradient(135deg, #D4A843, #FFD700, #D4A843);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          max-width: 520px;
        }

        .hero-sub {
          font-size: 1.5rem;
          color: #01306B;
          line-height: 1.5;
          font-weight: 600;
          margin: 0 0 1.5rem 0;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: #475569;
          line-height: 1.7;
          font-weight: 400;
          margin: 0;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1.2rem 2.5rem;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 1.1rem;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #01306B, #1e5aad);
          color: white;
          box-shadow: 0 10px 25px -5px rgba(1, 48, 107, 0.4);
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #012550, #01306B);
          transform: translateY(-3px);
          box-shadow: 0 15px 30px -5px rgba(1, 48, 107, 0.5);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #01306B;
          border: 2px solid rgba(212,168,67,0.4);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .btn-secondary:hover {
          background: white;
          transform: translateY(-3px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          border-color: #D4A843;
        }

        .hero-graphic {
          flex: 1;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .main-glass {
          position: relative;
          width: 100%;
          max-width: 500px;
          aspect-ratio: 4/5;
          border-radius: 40px;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(212,168,67,0.3);
          box-shadow: 0 25px 50px -12px rgba(1,48,107,0.15);
          display: flex;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 32px;
        }

        .floating-card {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 2px solid rgba(212,168,67,0.3);
          border-radius: 20px;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .card-1 {
          bottom: 40px;
          left: -40px;
        }

        .card-2 {
          top: 60px;
          right: -30px;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #01306B;
          line-height: 1.1;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .emoji {
          font-size: 2rem;
          background: linear-gradient(135deg, #FFF9F0, #FEF3C7);
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .features-nav {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          z-index: 2;
        }

        .feature-nav-card {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(212,168,67,0.2);
          border-radius: 32px;
          padding: 2.5rem;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          cursor: pointer;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
          position: relative;
          overflow: hidden;
        }

        .feature-nav-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #01306B, #D4A843, #CC0000);
        }

        .feature-nav-card:hover {
          transform: translateY(-15px) scale(1.02);
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 25px 50px -12px rgba(1,48,107,0.15);
        }

        .nav-card-icon {
          width: 60px;
          height: 60px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }

        .bg-blue { background: linear-gradient(135deg, #01306B, #1e5aad); color: white; }
        .bg-gold { background: linear-gradient(135deg, #D4A843, #FFD700); color: white; }
        .bg-red { background: linear-gradient(135deg, #CC0000, #e53e3e); color: white; }

        .feature-nav-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #01306B;
        }

        .feature-nav-card p {
          color: #64748b;
          margin: 0;
          line-height: 1.5;
          font-size: 1.05rem;
        }

        .detailed-features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 3rem;
          padding: 4rem 0;
          border-top: 2px solid rgba(212,168,67,0.2);
          margin-bottom: 4rem;
        }

        .feature-box {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .feature-icon-wrapper {
          flex-shrink: 0;
        }

        .feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
          border: 1px solid rgba(212,168,67,0.2);
        }

        .feature-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #01306B;
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .feature-desc {
          font-size: 1.1rem;
          color: #475569;
          line-height: 1.6;
          margin: 0;
        }

        /* =========================
          CREDITS / MEET THE TEAM
        ========================= */

        .credits-area {
          width: 100%;
          position: relative;
        }

        .credits-launch-card {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #01306B 0%, #174f96 55%, #D4A843 140%);
          border-radius: 32px;
          padding: 2.2rem 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
          cursor: pointer;
          border: 2px solid rgba(255, 215, 0, 0.25);
          box-shadow: 0 18px 45px rgba(1, 48, 107, 0.18);
          transition: all 0.3s ease;
        }

        .credits-launch-card::before {
          content: '';
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: rgba(255, 215, 0, 0.12);
          top: -120px;
          right: -60px;
        }

        .credits-launch-card::after {
          content: '';
          position: absolute;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.07);
          bottom: -110px;
          left: 15%;
        }

        .credits-launch-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 24px 55px rgba(1, 48, 107, 0.27);
        }

        .credits-launch-left {
          display: flex;
          align-items: center;
          gap: 1.4rem;
          position: relative;
          z-index: 2;
        }

        .credits-launch-icon {
          width: 72px;
          height: 72px;
          flex-shrink: 0;
          border-radius: 22px;
          background: linear-gradient(135deg, #FFD700, #D4A843);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }

        .credits-launch-text {
          text-align: left;
        }

        .credits-launch-title {
          color: #ffffff;
          font-size: 1.65rem;
          font-weight: 800;
          margin: 0 0 0.35rem;
        }

        .credits-launch-desc {
          color: rgba(255, 255, 255, 0.78);
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }

        .credits-arrow {
          position: relative;
          z-index: 2;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.14);
          color: #FFD700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          transition: transform 0.3s ease;
        }

        .credits-arrow.open {
          transform: rotate(180deg);
        }


        /* Expanded credits */

        .credits-panel {
          margin-top: 1.75rem;
          border-radius: 36px;
          overflow: hidden;
          background: #ffffff;
          border: 2px solid rgba(212, 168, 67, 0.22);
          box-shadow: 0 20px 50px rgba(1, 48, 107, 0.1);
          animation: creditsReveal 0.4s ease;
        }

        @keyframes creditsReveal {
          from {
            opacity: 0;
            transform: translateY(-12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .credits-header {
          position: relative;
          text-align: center;
          padding: 3rem 2rem 2.5rem;
          background: linear-gradient(135deg, #F8FBFF, #FFF9E8);
          overflow: hidden;
        }

        .credits-header::before {
          content: '🦷';
          position: absolute;
          font-size: 10rem;
          opacity: 0.035;
          top: -30px;
          right: 5%;
          transform: rotate(-18deg);
        }

        .credits-eyebrow {
          display: inline-block;
          background: #01306B;
          color: #FFD700;
          padding: 0.4rem 1rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 1rem;
        }

        .credits-title {
          color: #01306B;
          font-size: 2.4rem;
          font-weight: 900;
          margin: 0 0 0.65rem;
        }

        .credits-subtitle {
          color: #64748b;
          font-size: 1rem;
          margin: 0 auto;
          max-width: 650px;
          line-height: 1.6;
        }

        .credits-content {
          padding: 3rem;
        }

        .credits-group {
          margin-bottom: 4rem;
        }

        .credits-group:last-child {
          margin-bottom: 0;
        }

        .credits-group-heading {
          text-align: center;
          margin-bottom: 2rem;
        }

        .credits-role-icon {
          width: 55px;
          height: 55px;
          margin: 0 auto 0.8rem;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          background: #FEF3C7;
        }

        .credits-group-title {
          color: #01306B;
          font-size: 1.45rem;
          font-weight: 800;
          margin: 0;
        }

        .credits-divider {
          width: 60px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #01306B, #D4A843);
          margin: 0.8rem auto 0;
        }

        .credits-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.5rem;
          max-width: 1050px;
          margin: 0 auto;
        }

        .credits-grid.two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          max-width: 720px;
        }

        .credits-grid.one {
          grid-template-columns: minmax(0, 360px);
          justify-content: center;
        }

        .credit-person {
          position: relative;
          background: linear-gradient(180deg, #ffffff 0%, #F8FAFC 100%);
          border: 2px solid #edf2f7;
          border-radius: 26px;
          padding: 2rem 1.4rem 1.6rem;
          text-align: center;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .credit-person::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 5px;
          background: linear-gradient(90deg, #01306B, #D4A843);
        }

        .credit-person:hover {
          transform: translateY(-8px);
          border-color: rgba(212, 168, 67, 0.6);
          box-shadow: 0 16px 35px rgba(1, 48, 107, 0.12);
        }

        .credit-photo-wrap {
          width: 128px;
          height: 128px;
          margin: 0 auto 1.25rem;
          padding: 5px;
          border-radius: 50%;
          background: linear-gradient(135deg, #01306B, #D4A843, #FFD700);
          box-shadow: 0 8px 25px rgba(1, 48, 107, 0.15);
          box-sizing: border-box;
        }

        .credit-photo-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #eef4fb, #ffffff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.8rem;
          border: 4px solid #ffffff;
          box-sizing: border-box;
        }

        .credit-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          border-radius: 50%;
          border: 4px solid #ffffff;
          box-sizing: border-box;
        }

        .credit-name {
          color: #01306B;
          font-size: 1.08rem;
          font-weight: 800;
          line-height: 1.35;
          margin: 0 0 0.7rem;
        }

        .credit-school {
          color: #475569;
          font-size: 0.9rem;
          font-weight: 600;
          margin: 0 0 0.2rem;
          line-height: 1.45;
        }

        .credit-university {
          color: #94a3b8;
          font-size: 0.86rem;
          margin: 0;
        }

        .credit-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: #FFF7D6;
          color: #9A7200;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          margin-bottom: 0.8rem;
        }

        @media (max-width: 900px) {
          .credits-grid {
            grid-template-columns: 1fr;
            max-width: 480px;
          }

          .credits-grid.two {
            grid-template-columns: 1fr;
            max-width: 480px;
          }
        }

        @media (max-width: 640px) {
          .credits-launch-card {
            padding: 1.5rem;
          }

          .credits-launch-icon {
            width: 58px;
            height: 58px;
            border-radius: 18px;
          }

          .credits-launch-title {
            font-size: 1.3rem;
          }

          .credits-launch-desc {
            font-size: 0.88rem;
          }

          .credits-arrow {
            width: 40px;
            height: 40px;
          }

          .credits-content {
            padding: 2rem 1rem;
          }

          .credits-title {
            font-size: 1.9rem;
          }
        }

        .learning-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(1, 48, 107, 0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1.5rem;
        }

        .learning-popup {
          width: 100%;
          max-width: 470px;
          background: #ffffff;
          border-radius: 28px;
          padding: 2.3rem;
          text-align: center;
          border: 3px solid #D4A843;
          box-shadow: 0 25px 60px rgba(1, 48, 107, 0.3);
          animation: popupAppear 0.25s ease-out;
        }

        @keyframes popupAppear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(15px);
          }

          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .learning-popup-icon {
          width: 75px;
          height: 75px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          background: #FEF3C7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.7rem;
        }

        .learning-popup h2 {
          color: #01306B;
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 1rem;
        }

        .learning-popup p {
          color: #64748b;
          font-size: 1rem;
          line-height: 1.6;
          margin: 0 0 1rem;
        }

        .learning-popup-question {
          color: #01306B !important;
          font-weight: 700;
          font-size: 1.08rem !important;
        }

        .learning-popup-actions {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .learning-popup-btn {
          min-width: 120px;
          padding: 0.85rem 1.5rem;
          border: none;
          border-radius: 999px;
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .learning-popup-yes {
          background: #01306B;
          color: #ffffff;
        }

        .learning-popup-yes:hover {
          background: #1e5aad;
          transform: translateY(-2px);
        }

        .learning-popup-no {
          background: #D4A843;
          color: #ffffff;
        }

        .learning-popup-no:hover {
          background: #b88d2e;
          transform: translateY(-2px);
        }

        @media (max-width: 1024px) {
          .hero-section {
            flex-direction: column;
            text-align: center;
            gap: 3rem;
          }

          .hero-content {
            align-items: center;
          }

          .hero-badge {
            margin: 0 auto;
          }

          .hero-title {
            font-size: 4.5rem;
          }

          .hero-subtitle {
             margin-left: auto;
             margin-right: auto;
          }

          .hero-actions {
            justify-content: center;
          }

          .features-nav {
            grid-template-columns: 1fr;
            max-width: 500px;
            margin: 0 auto;
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .hero-title {
            font-size: 3.5rem;
          }

          .hero-actions {
            flex-direction: column;
            width: 100%;
          }

          .btn {
            width: 100%;
          }

          .card-1 {
            left: -10px;
            bottom: -20px;
            transform: scale(0.85);
          }

          .card-2 {
            right: -10px;
            top: -20px;
            transform: scale(0.85);
          }
        }
      `}</style>

      <div className="homepage-container">
        <Navbar />

        <main className="homepage-main">
          <div className="bg-shape bg-shape-1"></div>
          <div className="bg-shape bg-shape-2"></div>
          <div className="bg-shape bg-shape-3"></div>

          <section className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">
                Kembara
                <br />
                <span className="text-gradient">Gigi Sihat</span>
              </h1>

              <div className="hero-description">
                <p className="hero-sub">
                  <i>{t("home.sub")}</i>
                </p>

                <p className="hero-subtitle">{t("home.subtitle")}</p>
              </div>

              <div className="hero-actions">
                <Link to="/join" className="btn btn-primary">
                  <span>{t("home.primaryButton")}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M5 12H19M19 12L12 5M19 12L12 19"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>

                <Link
                  to="/learning"
                  className="btn btn-secondary"
                  onClick={handleLearningZoneClick}
                >
                  {t("home.secondaryButton")}
                </Link>
              </div>
            </div>

            <div className="hero-graphic">
              <div className="glass-panel main-glass">
                <img
                  src={heroImage}
                  alt={t("home.heroAlt")}
                  className="hero-image"
                />
                <div className="floating-card stat-card card-1">
                  <span className="emoji">🦷</span>
                  <div className="stat-info">
                    <span className="stat-value">
                      {language === "bm"
                        ? "Tonton • Main • Belajar"
                        : "Watch • Play • Learn"}
                    </span>
                    <span className="stat-label">{t("home.statOneLabel")}</span>
                  </div>
                </div>
                <div className="floating-card stat-card card-2">
                  <span className="emoji">⭐</span>
                  <div className="stat-info">
                    <span className="stat-value">{t("home.statTwoValue")}</span>
                    <span className="stat-label">{t("home.statTwoLabel")}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="features-nav">
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-gold">🎥</div>
              <h3>{featureCards[0].title}</h3>
              <p>{featureCards[0].text}</p>
            </div>
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-blue">🧩</div>
              <h3>{featureCards[1].title}</h3>
              <p>{featureCards[1].text}</p>
            </div>
            <div className="feature-nav-card">
              <div className="nav-card-icon bg-red">🏆</div>
              <h3>{featureCards[2].title}</h3>
              <p>{featureCards[2].text}</p>
            </div>
          </section>
          {/* Credits */}
          <section className="credits-area">

            {/* Attractive Credits Tab */}
            <div
              className="credits-launch-card"
              onClick={() => setShowCredits(prev => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setShowCredits(prev => !prev);
                }
              }}
            >
              <div className="credits-launch-left">

                <div className="credits-launch-icon">
                  👥
                </div>

                <div className="credits-launch-text">
                  <h2 className="credits-launch-title">
                    {language === 'bm'
                      ? 'Kenali Pasukan Kami'
                      : 'Meet Our Team'}
                  </h2>

                  <p className="credits-launch-desc">
                    {language === 'bm'
                      ? 'Kenali individu di sebalik pembangunan Kembara Gigi Sihat'
                      : 'Meet the people behind Kembara Gigi Sihat'}
                  </p>
                </div>

              </div>

              <div className={`credits-arrow ${showCredits ? 'open' : ''}`}>
                ▼
              </div>
            </div>


            {showCredits && (
              <div className="credits-panel">

                {/* Heading */}
                <div className="credits-header">

                  <span className="credits-eyebrow">
                    {language === 'bm' ? 'Pasukan Kami' : 'Our Team'}
                  </span>

                  <h2 className="credits-title">
                    {language === 'bm'
                      ? 'Kredit'
                      : 'Credits'}
                  </h2>

                  <p className="credits-subtitle">
                    {language === 'bm'
                      ? 'Kembara Gigi Sihat dibangunkan melalui kerjasama pakar pendidikan pergigian, pembangun web dan penasihat pembangunan.'
                      : 'Kembara Gigi Sihat was developed through the collaboration of dental education experts, web developers and a web development advisor.'}
                  </p>

                </div>


                <div className="credits-content">

                  {/* =========================
                      DENTAL EXPERTS
                  ========================== */}
                  <div className="credits-group">

                    <div className="credits-group-heading">
                      <div className="credits-role-icon">🦷</div>

                      <h3 className="credits-group-title">
                        {language === 'bm'
                          ? 'Pembangun Kandungan Pendidikan & Pakar Bidang Khusus'
                          : 'Educational Content Developers & Subject Matter Experts'}
                      </h3>

                      <div className="credits-divider"></div>
                    </div>


                    <div className="credits-grid">

                      {/* Stephanie */}
                      <div className="credit-person">

                        <div className="credit-photo-wrap">
                          <img
                            src={stephaniePhoto}
                            alt="Dr. Stephanie Oung Ker Yue"
                            className="credit-photo"
                          />
                        </div>

                        <span className="credit-badge">
                          🦷 {language === 'bm' ? 'Pakar Pergigian' : 'Dental Expert'}
                        </span>

                        <h4 className="credit-name">
                          Dr. Stephanie Oung Ker Yue
                        </h4>

                        <p className="credit-school">
                          {language === 'bm'
                            ? 'Pusat Pengajian Sains Pergigian'
                            : 'School of Dental Sciences'}
                        </p>

                        <p className="credit-university">
                          Universiti Sains Malaysia
                        </p>

                      </div>


                      {/* Ruhaya */}
                      <div className="credit-person">

                        <div className="credit-photo-wrap">
                          <img
                            src={ruhayaPhoto}
                            alt="Dr. Ruhaya binti Hasan"
                            className="credit-photo"
                          />
                        </div>

                        <span className="credit-badge">
                          🦷 {language === 'bm' ? 'Pakar Pergigian' : 'Dental Expert'}
                        </span>

                        <h4 className="credit-name">
                          Dr. Ruhaya binti Hasan
                        </h4>

                        <p className="credit-school">
                          {language === 'bm'
                            ? 'Pusat Pengajian Sains Pergigian'
                            : 'School of Dental Sciences'}
                        </p>

                        <p className="credit-university">
                          Universiti Sains Malaysia
                        </p>

                      </div>


                      {/* Norkhafizah */}
                      <div className="credit-person">

                        <div className="credit-photo-wrap">
                          <img
                            src={norkhafizahPhoto}
                            alt="Associate Professor Dr. Norkhafizah binti Saddki"
                            className="credit-photo"
                          />
                        </div>

                        <span className="credit-badge">
                          🦷 {language === 'bm' ? 'Pakar Pergigian' : 'Dental Expert'}
                        </span>

                        <h4 className="credit-name">
                          Associate Professor Dr. Norkhafizah binti Saddki
                        </h4>

                        <p className="credit-school">
                          {language === 'bm'
                            ? 'Pusat Pengajian Sains Pergigian'
                            : 'School of Dental Sciences'}
                        </p>

                        <p className="credit-university">
                          Universiti Sains Malaysia
                        </p>

                      </div>

                    </div>
                  </div>


                  {/* =========================
                      WEB DEVELOPERS
                  ========================== */}
                  <div className="credits-group">

                    <div className="credits-group-heading">
                      <div className="credits-role-icon">💻</div>

                      <h3 className="credits-group-title">
                        {language === 'bm'
                          ? 'Pembangun Web'
                          : 'Web Developers'}
                      </h3>

                      <div className="credits-divider"></div>
                    </div>


                    <div className="credits-grid two">

                      {/* Punam */}
                      <div className="credit-person">

                        <div className="credit-photo-wrap">
                          <img
                            src={punamPhoto}
                            alt="Punam Kunpichai A/L Samli"
                            className="credit-photo"
                          />
                        </div>

                        <span className="credit-badge">
                          💻 {language === 'bm' ? 'Pembangun Web' : 'Web Developer'}
                        </span>

                        <h4 className="credit-name">
                          Punam Kunpichai A/L Samli
                        </h4>

                        <p className="credit-school">
                          {language === 'bm'
                            ? 'Pusat Pengajian Sains Komputer'
                            : 'School of Computer Sciences'}
                        </p>

                        <p className="credit-university">
                          Universiti Sains Malaysia
                        </p>

                      </div>


                      {/* Neoh */}
                      <div className="credit-person">

                        <div className="credit-photo-wrap">
                          <img
                            src={neohPhoto}
                            alt="Neoh Sing Shi"
                            className="credit-photo"
                          />
                        </div>

                        <span className="credit-badge">
                          💻 {language === 'bm' ? 'Pembangun Web' : 'Web Developer'}
                        </span>

                        <h4 className="credit-name">
                          Neoh Sing Shi
                        </h4>

                        <p className="credit-school">
                          {language === 'bm'
                            ? 'Pusat Pengajian Sains Komputer'
                            : 'School of Computer Sciences'}
                        </p>

                        <p className="credit-university">
                          Universiti Sains Malaysia
                        </p>

                      </div>

                    </div>
                  </div>


                  {/* =========================
                      WEB DEVELOPMENT ADVISOR
                  ========================== */}
                  <div className="credits-group">

                    <div className="credits-group-heading">
                      <div className="credits-role-icon">🎓</div>

                      <h3 className="credits-group-title">
                        {language === 'bm'
                          ? 'Penasihat Pembangunan Web'
                          : 'Web Development Advisor'}
                      </h3>

                      <div className="credits-divider"></div>
                    </div>


                    <div className="credits-grid one">

                      <div className="credit-person">

                        <div className="credit-photo-wrap">
                          <img
                            src={suziPhoto}
                            alt="Dr. Suzi Iryanti binti Fadilah"
                            className="credit-photo"
                          />
                        </div>

                        <span className="credit-badge">
                          🎓 {language === 'bm' ? 'Penasihat' : 'Advisor'}
                        </span>

                        <h4 className="credit-name">
                          Dr. Suzi Iryanti binti Fadilah
                        </h4>

                        <p className="credit-school">
                          {language === 'bm'
                            ? 'Pusat Pengajian Sains Komputer'
                            : 'School of Computer Sciences'}
                        </p>

                        <p className="credit-university">
                          Universiti Sains Malaysia
                        </p>

                      </div>

                    </div>
                  </div>

                </div>
              </div>
            )}

          </section>
        </main>

        {showLearningPopup && (
          <div className="learning-popup-overlay">
            <div className="learning-popup">
              <div className="learning-popup-icon">🦷</div>

              <h2>
                {language === "bm" ? "Zon Pembelajaran" : "Learning Zone"}
              </h2>

              <p>
                {language === "bm"
                  ? "Sila lengkapkan Kembara Gigi Sihat sebelum meneruskan ke Zon Pembelajaran."
                  : "Complete Kembara Gigi Sihat before proceeding to the Learning Zone."}
              </p>

              <p className="learning-popup-question">
                {language === "bm"
                  ? "Adakah anda telah melengkapkan Kembara Gigi Sihat?"
                  : "Have you completed Kembara Gigi Sihat?"}
              </p>

              <div className="learning-popup-actions">
                <button
                  type="button"
                  className="learning-popup-btn learning-popup-yes"
                  onClick={handleLearningYes}
                >
                  {language === "bm" ? "Ya" : "Yes"}
                </button>

                <button
                  type="button"
                  className="learning-popup-btn learning-popup-no"
                  onClick={handleLearningNo}
                >
                  {language === "bm" ? "Tidak" : "No"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  );
};

export default HomePage;
