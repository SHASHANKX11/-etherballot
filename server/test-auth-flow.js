const http = require("http");

const request = (path, method = "GET", body = null) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: "localhost",
        port: 5000,
        path: `/api${path}`,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let resBody = "";
        res.on("data", (chunk) => (resBody += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      },
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
};

const run = async () => {
  console.log("--- STARTING VOTER REGISTRATION & LOGIN E2E VERIFICATION ---");

  // Random 12-digit Aadhaar for testing
  const aadhaarNumber =
    "9" +
    Math.floor(10000000000 + Math.random() * 90000000000)
      .toString()
      .slice(0, 11);
  const mobile =
    "98" + Math.floor(10000000 + Math.random() * 90000000).toString();
  const email = `voter.${Date.now()}@example.com`;
  const demoFace = Array.from({ length: 128 }, (_, i) =>
    Number((Math.sin(i * 0.1) * 0.05).toFixed(4)),
  );

  console.log(
    `Testing with Aadhaar: ${aadhaarNumber}, Mobile: ${mobile}, Email: ${email}`,
  );

  // Step 1: Validate Aadhaar
  console.log("1. Testing Aadhaar Validation...");
  const valRes = await request("/auth/validate-aadhaar", "POST", {
    aadhaarNumber,
  });
  console.log(`   Status: ${valRes.status}, Success: ${valRes.data.success}`);
  if (!valRes.data.success) throw new Error("Aadhaar validation failed");

  // Step 2: Send & Verify OTP
  console.log("2. Testing OTP Dispatch...");
  const otpRes = await request("/auth/send-otp", "POST", { mobile });
  console.log(
    `   Status: ${otpRes.status}, OTP received in dev: ${otpRes.data.otp}`,
  );
  const testOtp = otpRes.data.otp;

  console.log("3. Testing OTP Verification...");
  const verifyRes = await request("/auth/verify-otp", "POST", {
    mobile,
    otp: testOtp,
  });
  console.log(
    `   Status: ${verifyRes.status}, Verified: ${verifyRes.data.verified}`,
  );
  if (!verifyRes.data.verified) throw new Error("OTP verification failed");

  // Step 4: Register Voter
  console.log("4. Testing Voter Registration (Form 6)...");
  const regRes = await request("/auth/register", "POST", {
    aadhaarNumber,
    name: "Citizen Test Voter",
    email,
    mobile,
    dateOfBirth: "1995-05-15",
    gender: "female",
    state: "Maharashtra",
    district: "Mumbai City",
    faceDescriptor: demoFace,
  });
  console.log(`   Status: ${regRes.status}, Message: ${regRes.data.message}`);
  if (!regRes.data.success)
    throw new Error(`Registration failed: ${regRes.data.message}`);

  // Step 5: Test Login Step 1 (Aadhaar lookup)
  console.log("5. Testing Voter Login Step 1 (Aadhaar Lookup)...");
  const loginRes = await request("/auth/login", "POST", { aadhaarNumber });
  console.log(
    `   Status: ${loginRes.status}, Masked Mobile: ${loginRes.data.mobile}, Raw Mobile (dev): ${loginRes.data.rawMobile}`,
  );
  if (!loginRes.data.success) throw new Error("Login Step 1 failed");
  const userId = loginRes.data.userId;

  // Step 6: Test Login Step 2 (Mobile OTP)
  console.log("6. Testing Login Mobile OTP...");
  const loginOtpRes = await request("/auth/send-otp", "POST", {
    mobile: loginRes.data.rawMobile,
  });
  const loginOtp = loginOtpRes.data.otp;
  const loginVerifyRes = await request("/auth/verify-otp", "POST", {
    mobile: loginRes.data.rawMobile,
    otp: loginOtp,
  });
  console.log(
    `   Status: ${loginVerifyRes.status}, Verified: ${loginVerifyRes.data.verified}`,
  );

  // Step 7: Test Login Step 3 (Biometric Face Match)
  console.log("7. Testing Login Biometric Face Verification...");
  const faceRes = await request("/auth/login/verify-face", "POST", {
    userId,
    faceDescriptor: demoFace,
  });
  console.log(
    `   Status: ${faceRes.status}, Token received: ${!!faceRes.data.token}, Message: ${faceRes.data.message}`,
  );
  if (!faceRes.data.success || !faceRes.data.token)
    throw new Error("Face verification login failed");

  // Step 8: Test Demo Bypass Flag
  console.log("8. Testing Login Face Verification with Demo Bypass...");
  const bypassRes = await request("/auth/login/verify-face", "POST", {
    userId,
    faceDescriptor: Array(128).fill(0), // arbitrary vector
    isDemoBypass: true,
  });
  console.log(
    `   Status: ${bypassRes.status}, Bypass Success: ${bypassRes.data.success}`,
  );
  if (!bypassRes.data.success) throw new Error("Demo bypass failed");

  console.log("✅ ALL VOTER REGISTRATION AND LOGIN FLOW TESTS PASSED!");
};

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
