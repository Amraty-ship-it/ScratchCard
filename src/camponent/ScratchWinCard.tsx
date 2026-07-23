"use client";

import { amount, payeeName, upiId } from "@/data/data";
import React, { useEffect, useRef, useState, useCallback } from "react";

const SCRATCH_RADIUS = 50;
const REVEAL_THRESHOLD = 0.20; // 55% scratched = auto-reveal

export default function ScratchWinCard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scratched, setScratched] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [message, setMessage] = useState("");
    const isDrawing = useRef(false);

    /* ── Draw the silver scratch layer ── */
    const drawScratchLayer = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        /* Silver gradient background */
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#c8c8c8");
        grad.addColorStop(0.3, "#e8e8e8");
        grad.addColorStop(0.6, "#b0b0b0");
        grad.addColorStop(1, "#d0d0d0");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        /* Subtle texture lines */
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.height; i += 6) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        /* "Scratch Here" hint text */
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = "rgba(80,80,80,0.6)";
        ctx.textAlign = "center";
        ctx.fillText("🪙 Scratch Here!", canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "rgba(80,80,80,0.45)";
        ctx.fillText("Drag your finger to reveal", canvas.width / 2, canvas.height / 2 + 14);
    }, []);

    useEffect(() => {
        drawScratchLayer();
    }, [drawScratchLayer]);

    /* ── Erase scratch layer at (x,y) ── */
    const scratch = useCallback((x: number, y: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, SCRATCH_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        setScratched(true);
        checkRevealThreshold();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Check what % has been scratched ── */
    // const checkRevealThreshold = useCallback(() => {
    //     const canvas = canvasRef.current;
    //     if (!canvas) return;
    //     const ctx = canvas.getContext("2d");
    //     if (!ctx) return;

    //     const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    //     let transparent = 0;
    //     for (let i = 3; i < data.length; i += 4) {
    //         if (data[i] < 128) transparent++;
    //     }
    //     const ratio = transparent / (data.length / 4);
    //     if (ratio > REVEAL_THRESHOLD) {
    //         /* Clear entire layer for clean reveal */
    //         ctx.clearRect(0, 0, canvas.width, canvas.height);
    //         setRevealed(true);
    //     }
    // }, []);

  const handleClaim = () => {
        setClaimed(true);
        if (isMobile) {
            // On Android try PhonePe intent first, fallback to generic upi://
            window.location.href = /android/i.test(navigator.userAgent) ? phonePeIntent : upiLink;
        }
        // On desktop: the button in the UI shows a message explaining why
    };


    const checkRevealThreshold = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 128) transparent++;
    }

    const ratio = transparent / (data.length / 4);

    if (ratio > REVEAL_THRESHOLD && !revealed) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setRevealed(true);

        // Automatically claim
        handleClaim();
    }
}, [revealed, handleClaim]);

    /* ── Pointer helpers ── */
    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ("touches" in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const onMouseDown = (e: React.MouseEvent) => {
        isDrawing.current = true;
        scratch(...Object.values(getPos(e, canvasRef.current!)) as [number, number]);
    };
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing.current) return;
        scratch(...Object.values(getPos(e, canvasRef.current!)) as [number, number]);
    };
    const onMouseUp = () => { isDrawing.current = false; };

    const onTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        isDrawing.current = true;
        scratch(...Object.values(getPos(e, canvasRef.current!)) as [number, number]);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        scratch(...Object.values(getPos(e, canvasRef.current!)) as [number, number]);
    };
    const onTouchEnd = () => { isDrawing.current = false; };




    // Properly encoded UPI deep-link
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Scratch Card Prize')}`;

    // PhonePe Android intent — works even when browser can't resolve upi://
    const phonePeIntent = `intent://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR#Intent;scheme=upi;package=com.phonepe.app;end`;

    const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad/i.test(navigator.userAgent);

  

    const handleReset = () => {
        setScratched(false);
        setRevealed(false);
        setClaimed(false);
        setMessage("");
        setTimeout(drawScratchLayer, 50);
    };

    return (
        <main style={{ minHeight: "100vh", background: "#fff", fontFamily: "sans-serif" }}>
            {/* ── Header ── */}
            <header style={{ background: "#fff", padding: "20px 16px 12px", textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: "#5f259f",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, fontWeight: 900, color: "#fff",
                    }}>
                        पे
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 900, color: "#5f259f", margin: 0 }}>
                        PhonePe
                    </h1>
                </div>
                <p style={{ marginTop: 6, fontSize: 13, color: "#888" }}>
                    India&apos;s Favorite Payments App
                </p>
            </header>

            {/* ── Main purple section ── */}
            <section style={{
                background: "linear-gradient(180deg, #7b2ff7 0%, #5f259f 50%, #2d0f5e 100%)",
                padding: "28px 16px 40px",
                minHeight: "calc(100vh - 110px)",
            }}>
                <h2 style={{
                    textAlign: "center", fontSize: 26, fontWeight: 900,
                    color: "#ffe600", margin: 0, letterSpacing: 0.2,
                }}>
                    🎉 Scratch &amp; Win Big! 🎉
                </h2>
                <p style={{ textAlign: "center", color: "#fff", fontSize: 15, marginTop: 8 }}>
                    You&apos;ve been selected for an exclusive reward!
                </p>

                {/* ── Scratch Card ── */}
                <div style={{
                    maxWidth: 360,
                    margin: "28px auto 0",
                    borderRadius: 20,
                    overflow: "hidden",
                    border: "3px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
                }}>
                    {/* Card header bar */}
                    <div style={{
                        background: "#5f259f",
                        padding: "10px 12px",
                        textAlign: "center",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 15,
                    }}>
                        Festive Bonus Offer
                    </div>

                    {/* Scratch area */}
                    <div style={{ position: "relative", background: "#ffe600", userSelect: "none" }}>
                        {/* Prize beneath — always rendered */}
                        <div style={{
                            padding: "36px 20px 32px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            position: "relative",
                            overflow: "hidden",
                        }}>
                            <ConfettiDecor />

                            <div style={{
                                width: 100, height: 100, borderRadius: "50%",
                                background: "#5f259f",
                                border: "5px solid #fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 42, fontWeight: 900, color: "#fff",
                                boxShadow: "0 4px 16px rgba(95,37,159,0.4)",
                                marginBottom: 20,
                            }}>
                                पे
                            </div>

                            <h3 style={{
                                margin: 0, fontSize: 36, fontWeight: 900, color: "#111",
                            }}>
                                You&apos;ve Won
                            </h3>

                            <p style={{
                                margin: "10px 0 0", fontSize: 52, fontWeight: 900,
                                color: "#5f259f",
                            }}>
                                ₹ 496
                            </p>

                            {revealed && (
                                <p style={{
                                    marginTop: 12, fontSize: 13, color: "#555",
                                }}>
                                    🎊 Congratulations! 🎊
                                </p>
                            )}
                        </div>

                        {/* Canvas scratch overlay */}
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={480}
                            style={{
                                position: "absolute",
                                inset: 0,
                                width: "100%",
                                height: "100%",
                                zIndex: 2,
                                cursor: "crosshair",
                                touchAction: "none",
                                borderRadius: 0,
                                opacity: revealed ? 0 : 1,
                                transition: revealed ? "opacity 0.5s ease" : "none",
                                pointerEvents: revealed ? "none" : "auto",
                            }}
                            onMouseDown={onMouseDown}
                            onMouseMove={onMouseMove}
                            onMouseUp={onMouseUp}
                            onMouseLeave={onMouseUp}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        />
                    </div>
                </div>

                {/* ── Scratch progress / Reveal button ── */}
                {!revealed && scratched && (
                    <div style={{ textAlign: "center", marginTop: 14 }}>
                        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                            Keep scratching to reveal your prize…
                        </p>
                        <button
                            onClick={() => {
                                const canvas = canvasRef.current;
                                if (canvas) {
                                    const ctx = canvas.getContext("2d");
                                    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
                                }
                                setRevealed(true);
                            }}
                            style={{
                                marginTop: 8,
                                background: "transparent",
                                border: "1px solid rgba(255,255,255,0.4)",
                                color: "rgba(255,255,255,0.6)",
                                borderRadius: 8,
                                padding: "5px 14px",
                                fontSize: 12,
                                cursor: "pointer",
                            }}
                        >
                            Reveal instantly
                        </button>
                    </div>
                )}

                {/* ── Claim Box (visible after reveal) ── */}
                {revealed && (
                    <div style={{
                        maxWidth: 380,
                        margin: "20px auto 0",
                        background: "#fff",
                        borderRadius: 20,
                        padding: "20px 20px 16px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                        textAlign: "center",
                        animation: "slideUp 0.4s ease",
                    }}>
                        {!claimed ? (
                            <>
                                <button
                                    type="button"
                                    id="claim-prize-btn"
                                    onClick={handleClaim}
                                    style={{
                                        width: "100%",
                                        padding: "16px 20px",
                                        borderRadius: 14,
                                        background: "linear-gradient(135deg, #7b2ff7, #5f259f)",
                                        color: "#fff",
                                        fontWeight: 800,
                                        fontSize: 17,
                                        border: "none",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 16px rgba(95,37,159,0.4)",
                                        transition: "transform 0.15s",
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                                    onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                                >
                                    Claim Your Prize Now
                                </button>
                                <p style={{ marginTop: 12, fontSize: 13, color: "#999" }}>
                                    T&amp;C Apply | Valid for limited time only
                                </p>
                            </>
                        ) : (
                            <>
                                {isMobile ? (
                                    /* Mobile: show a direct open button in case the auto-redirect was blocked */
                                    <>
                                        <p style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
                                            Opening PhonePe… If it didn&apos;t open automatically:
                                        </p>
                                        <a
                                            href={/android/i.test(navigator.userAgent) ? phonePeIntent : upiLink}
                                            style={{
                                                display: "block",
                                                width: "100%",
                                                padding: "14px 20px",
                                                borderRadius: 14,
                                                background: "linear-gradient(135deg, #5f259f, #3d1a6e)",
                                                color: "#fff",
                                                fontWeight: 800,
                                                fontSize: 16,
                                                textDecoration: "none",
                                                boxSizing: "border-box",
                                            }}
                                        >
                                            📲 Open PhonePe Now
                                        </a>
                                    </>
                                ) : (
                                    /* Desktop: upi:// links don't work — explain why */
                                    <p style={{
                                        padding: "12px 14px",
                                        background: "#fef9c3",
                                        borderRadius: 10,
                                        fontSize: 13,
                                        color: "#92400e",
                                        fontWeight: 500,
                                        lineHeight: 1.5,
                                    }}>
                                        ⚠️ UPI deep-links only work on mobile.
                                        Open this page on your phone to pay via PhonePe.
                                    </p>
                                )}
                                <button
                                    onClick={handleReset}
                                    style={{
                                        marginTop: 12,
                                        background: "#f3f4f6",
                                        border: "none",
                                        borderRadius: 10,
                                        padding: "10px 20px",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color: "#5f259f",
                                        cursor: "pointer",
                                    }}
                                >
                                    🔄 Try Again
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ── Security Section ── */}
                <div style={{
                    maxWidth: 380,
                    margin: "24px auto 0",
                    background: "rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    color: "#fff",
                }}>
                    <div style={{ flexShrink: 0 }}>
                        <HexBadge />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#fff" }}>
                            Your money stays safe.
                        </h3>
                        <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                            PhonePe protects your money with security systems that help minimize frauds.
                        </p>
                        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <SecurityBadge label="PCI DSS" />
                            <SecurityBadge label="ISO 27001" />
                        </div>
                    </div>
                </div>

                <p style={{
                    textAlign: "center", marginTop: 24, fontSize: 11,
                    color: "rgba(255,255,255,0.4)",
                    maxWidth: 320, margin: "24px auto 0", lineHeight: 1.6,
                }}>
                    This is a static UI practice component and not an official reward or payment screen.
                </p>
            </section>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </main>
    );
}

/* ── Sub-components ── */

function ConfettiDecor() {
    const pieces = [
        { left: "6%", top: "12%", color: "#f43f5e", rotate: 20, w: 10, h: 5 },
        { left: "12%", top: "28%", color: "#22c55e", rotate: -30, w: 8, h: 4 },
        { left: "4%", top: "55%", color: "#3b82f6", rotate: 55, w: 7, h: 7 },
        { left: "18%", top: "70%", color: "#f97316", rotate: -15, w: 6, h: 3 },
        { right: "6%", top: "10%", color: "#06b6d4", rotate: -25, w: 10, h: 5 },
        { right: "14%", top: "30%", color: "#f43f5e", rotate: 60, w: 7, h: 4 },
        { right: "5%", top: "55%", color: "#22c55e", rotate: -40, w: 8, h: 8 },
        { right: "18%", top: "72%", color: "#f97316", rotate: 15, w: 6, h: 3 },
    ] as const;

    return (
        <>
            {pieces.map((p, i) => (
                <div key={i} style={{
                    position: "absolute",
                    ...(("left" in p) ? { left: p.left } : { right: p.right }),
                    top: p.top,
                    width: p.w, height: p.h,
                    background: p.color,
                    borderRadius: 2,
                    transform: `rotate(${p.rotate}deg)`,
                    opacity: 0.85,
                }} />
            ))}
        </>
    );
}

function HexBadge() {
    return (
        <svg width="72" height="80" viewBox="0 0 72 80" fill="none">
            <polygon points="36,2 70,20 70,60 36,78 2,60 2,20"
                fill="#b0c4de" stroke="#8aa8c8" strokeWidth="2" />
            <text x="36" y="36" textAnchor="middle" dominantBaseline="middle"
                fontSize="11" fontWeight="900" fill="#1e3a5f">100%</text>
            <text x="36" y="52" textAnchor="middle" dominantBaseline="middle"
                fontSize="9" fontWeight="800" fill="#0e7490">SECURE</text>
        </svg>
    );
}

function SecurityBadge({ label }: { label: string }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 6, padding: "3px 8px",
            fontSize: 11, fontWeight: 700, color: "#fff",
        }}>
            <span style={{ color: "#4ade80", fontSize: 13 }}>✓</span>
            {label}
        </div>
    );
}