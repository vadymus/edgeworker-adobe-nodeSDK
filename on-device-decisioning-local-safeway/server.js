const _ = require("lodash");
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");
const Handlebars = require("handlebars");
const TargetClient = require("@adobe/target-nodejs-sdk");

const PAGE_TITLE = "Target On-Device Decisioning Sample";
// Load the template of the HTML page returned in the response
const TEMPLATE = fs.readFileSync(`${__dirname}/index.handlebars`).toString();
const handlebarsTemplate = Handlebars.compile(TEMPLATE);

const app = express();
app.use(express.static("public"));
app.use(cookieParser());

const RESPONSE_HEADERS = {
  "Content-Type": "text/html",
  Expires: new Date().toUTCString(),
};

function saveCookie(res, cookie) {
  if (!cookie) {
    return;
  }

  res.cookie(cookie.name, cookie.value, { maxAge: cookie.maxAge * 1000 });
}

function sendHtml(res, pageContext) {
  const html = handlebarsTemplate({
    pageTitle: PAGE_TITLE,
    ...pageContext,
  });

  res.status(200).send(html);
}

function sendSuccessResponse(res, targetResponse) {
  res.set(RESPONSE_HEADERS);
  saveCookie(res, targetResponse.targetCookie);

  const offer = _.get(
    targetResponse,
    "response.execute.mboxes[0].options[0].content", "response.visitorState"
  );

  const visitorState = _.get(
    targetResponse,
    "visitorState"
  );

  const test = "test";

  sendHtml(res, {
    targetResponse: JSON.stringify(targetResponse, null, 4),
    offer: JSON.stringify(offer),
    visitorState:JSON.stringify(visitorState)
  });
}



function sendErrorResponse(res, error) {
  res.set(RESPONSE_HEADERS);
  sendHtml(res, {
    error: true,
    targetResponse: `ERROR: ${error.message}`,
  });
}

const CONFIG = {
  client: "safewayinc",
  organizationId: "A7BF3BC75245ADF20A490D4D@AdobeOrg",
  propertyToken: "4f1a0288-f0d0-5f83-62d3-ae6a26b3bd6c",
  decisioningMethod: "on-device",
  pollingInterval: 300000,
  artifactLocation: "https://assets.adobetarget.com/safewayinc/production/v1/rules.json",
  events: {
    clientReady:startExpressApp
  },
};

const targetClient = TargetClient.create(CONFIG);

function startExpressApp() {
  app.get("/", async (req, res) => {
    const targetCookie = req.cookies[TargetClient.TargetCookieName];
    const request = {
      context: {
        userAgent: req.get("user-agent"),
        channel: "web",
        browser: { host: req.get("host") },
      },
      execute: {
        mboxes: [{ name: "server-side-mike-ab" }],
      },
    };

    try {
      const response = await targetClient.getOffers({
        request,
        targetCookie,
      });
      sendSuccessResponse(res, response);
    } catch (error) {
      console.error("Target:", error);
      sendErrorResponse(res, error);
    }
  });

  app.listen(3000, function () {
    console.log("Listening on port 3000 and watching!");
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server close');
    });
  });
}