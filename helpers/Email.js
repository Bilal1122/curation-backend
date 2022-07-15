const node_mailer = require('nodemailer');
const KEYS = require('../configs/keys');
let fileUploadConfirmationEmail = ['badakang@gmail.com'];

module.exports = {
  sendEmail: async (
    email,
    vCode = null,
    type,
    user_id = null,
    datasetMessage = null,
    userInfo,
    fileLink,
    reportType,
    title,
    groupName
  ) => {
    let message = {};
    let transporter;

    if (KEYS.dev) {
      console.log('transporter!! if');
      // transporter = node_mailer.createTransport({
      //   host: 'smtp.gmail.com',
      //   port: 465,
      //   secure: true, // use SSL
      //   auth: {
      //     user: 'gnakadab.dev',
      //     pass: 'dnvmdtxhjfcrlrdu'
      //   }
      // });
      transporter = node_mailer.createTransport({
        name: 'box2419.bluehost.com',
        host: 'box2419.bluehost.com',
        port: 465,
        maxConnections: 10000,
        secure: true,
        auth: {
          user: 'test1@crunchdigital.com',
          pass: '3m&Ur4^DG;.L',
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    } else {
      console.log('transporter!! else');
      transporter = node_mailer.createTransport({
        name: 'box716.bluehost.com',
        host: 'box716.bluehost.com',
        port: 465,
        maxConnections: 10000,
        secure: true,
        auth: {
          user: 'tempo@crunchdigital.com',
          pass: 'm1.D/bRms-M.',
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    // gnakadab.dev@gmail.com / notAvailable1!
    switch (type) {
      case 'resetPassword':
        message = resetPassword(email, vCode);
        break;
      case 'verification':
        message = verify(email, user_id, userInfo);
        break;
      case 'datasetUpload':
        message = datasetUpload(datasetMessage, fileUploadConfirmationEmail[0]);
        break;
      case 'contactUs':
        message = contactUs(datasetMessage, email, 'tempo@crunchdigital.com');
        break;
      case 'userSignedUp':
        message = notifyUserSignedUp(userInfo);
        break;
      case 'sendReports':
        message = sendReports(email, fileLink, reportType, title, groupName);
        break;
      case 'test':
        message = testEmail();
        break;
      default:
        break;
    }

    await transporter.sendMail(message, (error, info) => {
      if (error) {
        console.log('Error occurred');
        console.log(error.message);
      }

      console.log('Message sent successfully!');
      // console.log('->>', info);
      transporter.close();
    });
    return;
  },
};

function testEmail() {
  return {
    from: 'tempo@crunchdigital.com',
    to: `hadi.tariq02@gmail.com`,
    subject: `T E M P O – Reset password.`,
    html: `<p>test is a test email</p>`,
  };
}

function resetPassword(email, vCode) {
  return {
    from: 'tempo@crunchdigital.com',
    to: `${email}`,
    subject: `T E M P O – Reset password.`,
    html: `<p>Please use this following link to <a href="${KEYS.frontEnd_URL}reset-password/${vCode}">reset your password</a>.</p>
           <p>If you did not request this password change please report it to tempo@crunchdigital.com or you may ignore it.</p>
           <p>If you have any comments or questions, please don't hesitate to reach us at tempo@crunchdigital.com.</p>
           <p>Crunch Digital</p>`,
  };
}

function verify(email, user_id, userInfo) {
  return {
    from: 'tempo@crunchdigital.com',
    to: email,
    subject: `Access to T E M P O – Email Confirmation.`,
    html: `<span> Hi! <b>${userInfo.username}</b></span>.
           <p>Here is your confirmation!</p>
           <p>Please use this following link to <a href="${KEYS.frontEnd_URL}email-verify/${user_id}">verify your email</a>.</p>
           <p>If you have any comments or questions, please don't hesitate to reach us at tempo@crunchdigital.com.</p>
           <p>Crunch Digital</p>`,
  };
}

function notifyUserSignedUp(userInfo) {
  return {
    from: 'tempo@crunchdigital.com',
    to: 'tempo-newuser@crunchdigital.com',
    subject: `Alert: TEMPO New User Account Sign Up`,
    html: `<p>A new user has signed up for Tempo:</p>
           <p>Group Name: ${userInfo._group.name}</p>
           <p>User Name: ${userInfo.username}</p>
           <p>Email Address: ${userInfo.email}</p>
           <p>Date: ${userInfo.createdAt}</p>`,
  };
}

function datasetUpload(datesetMessage, email) {
  return {
    from: 'tempo@crunchdigital.com',
    to: email,
    subject: `Curation Portal -- Data Test`,
    html: datesetMessage,
  };
}

function contactUs(datasetMessage, from, to) {
  return {
    from: from,
    to: to,
    subject: `T E M P O -- Inquiry by ${datasetMessage.email}.`,
    html: `<p>Contact Name: ${datasetMessage.name}</p>
        <p>Company: ${datasetMessage.company}</p>
        <p>Email Address: ${datasetMessage.email}</p>
        <p>Phone: ${datasetMessage.phone}</p>
        <p>Business Area: ${datasetMessage.businessArea}</p>
        <p>Schedule a Call: ${datasetMessage.interestCall ? 'Yes' : 'No'}</p>
        <p>Schedule a Demo: ${datasetMessage.interestDemo ? 'Yes' : 'No'}</p>
        <p>How did you hear about Crunch Digital?: ${datasetMessage.howHear}</p>
        <p>What would you like to discuss?: ${datasetMessage.whatDiscuss}</p>`,
  };
}

function sendReports(to, fileLink, reportType, title, groupName) {
  return {
    from: 'tempo@crunchdigital.com',
    to,
    subject: `TEMPO ${title} ${reportType}`,
    html: `<p>Hi,</p>
    <p>Please use the link below to access your weekly/monthly validation activity 
    summary report for your group ${groupName}.  The summary report shows the track titles 
    during the calendar dates shown that were validated on Tempo by your group 
    that were indicated as not available under your music licenses at the time 
    the validations were performed.   
    </p>
   <p>If you have any questions about the availability of the tracks shown on the 
   report please email tempo-research@crunchdigital.com and please attach the report 
   to your email with your questions.  Please include your group name in the subject 
   of your email “Group Name – Validation Questions”.
  </p>
    <a href=${fileLink}>${fileLink}</a>   
  <p>Thank you.</p>
  </p>Crunch Digital</p>`,
  };
}
