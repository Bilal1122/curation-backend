const AvailableTracks = require('../models/AvailableTracks');

const generateLogsForTrack = async (
  track,
  userPreferences,
  type,
  getUserGroupDetails,
  availableTracks
) => {
  let total_share = 0;
  // find available tracks match

  if (
    !userPreferences.filterByLicencedLabels &&
    !userPreferences.filterByLicencedPROs &&
    !userPreferences.filterByLicencedPublishers
  ) {
    track.matchWithLocalTracks = false;
    track.newFormatLogReason.noMatch = 'No Match';
    return { track };
  }

  let getTrack = await AvailableTracks.findOne({
    _id: track.localTrack,
  }).catch((err) => console.log(err));

  let newFormatLogReason = {};
  let isAnyPubMisMatch = false;
  // user groups publisher
  if (getTrack) {
    track.matchWithLocalTracks = false;
    if (userPreferences.filterByLicencedPublishers) {
      let isUnavailable = false;
      if (!getUserGroupDetails._publisher.length) {
        track.matchWithLocalTracks = false;
        track.publisherUnMatch = false;
        isUnavailable = true;
        isAnyPubMisMatch = true;
      }
      
      for (let j = 0; j < getUserGroupDetails._publisher.length; j++) {
        if (getUserGroupDetails._publisher[j]) {
          let isPublisherInIt =
            getTrack.publishers[getUserGroupDetails._publisher[j].name];
          if (isPublisherInIt) {
            // clean percentage share %
            let number = parseFloat(isPublisherInIt.split('%')[0] * 1);
            total_share += number;
          }

          // if match by 100 track matches
          if (total_share == 100) {
            track.matchWithLocalTracks = true;
            isUnavailable = false;
          } else {
            track.matchWithLocalTracks = false;
            track.publisherUnMatch = false;
            isUnavailable = true;
          }
        } else {
          track.matchWithLocalTracks = false;
          track.publisherUnMatch = false;
          isUnavailable = true;
          isAnyPubMisMatch = true;
        }
      }

      let publisherUnMatchString = 'Publishers(';
      if (track.publisherUnMatch === false) {
        let allPubsOfTracks = Object.keys(getTrack.publishers);
        console.log(getUserGroupDetails.pub_names, '---------ALLL');
        allPubsOfTracks.forEach((item) => {
          if (!getUserGroupDetails.pub_names.includes(item)) {
            publisherUnMatchString += `${item}(${getTrack.publishers[item]}) `;
            isAnyPubMisMatch = true;
          }
        });
        publisherUnMatchString += ')';
        if (isAnyPubMisMatch) {
          newFormatLogReason.publisher = publisherUnMatchString;
          track.matchWithLocalTracks = false;
        } else {
          track.matchWithLocalTracks = true;
          track.publisherUnMatch = false;
        }
        // isAnyPubMisMatch = false;
      }
    }
    let labelUnMatchString = 'Label(';

    if (userPreferences.filterByLicencedLabels && getTrack.label.length) {
      // console.log('IINN label ----- ', getTrack.label, {
      //   result: getUserGroupDetails._labels.includes(getTrack.label),
      // });
      const exists = getUserGroupDetails._labels.includes(getTrack.label);
      if (!getTrack.label.length || !exists) {
        labelUnMatchString += `${getTrack.label}`;
        isAnyPubMisMatch = true;
        track.matchWithLocalTracks = false;
        console.log(getUserGroupDetails._labels, '<><><><><><><><><');
      }
      labelUnMatchString += ')';
      if (isAnyPubMisMatch) {
        if (!exists) {
          newFormatLogReason.label = labelUnMatchString;
          track.matchWithLocalTracks = false;
          track.LabelUnMatch = true;
        }
        isAnyPubMisMatch = true;
      } else {
        track.matchWithLocalTracks = true;
        track.LabelUnMatch = false;
      }
    }
    let proUnMatchString = 'Pro(';
    if (userPreferences.filterByLicencedPROs && getTrack.PRO.length) {
      const exists = getUserGroupDetails._labels.includes(getTrack.label);
      if (!exists || !getTrack.PRO.length) {
        proUnMatchString += `${getTrack.PRO}`;
        track.matchWithLocalTracks = false;
        isAnyPubMisMatch = true;
      }
      proUnMatchString += ')';
      if (isAnyPubMisMatch) {
        newFormatLogReason.pro = proUnMatchString;
        track.matchWithLocalTracks = false;
        track.PROUnMatch = true;
      } else {
        track.matchWithLocalTracks = true;
        track.PROUnMatch = false;
      }
    }
  }
  // if (track.matchWithLocalTracks === true) {availableTracks.push(track)}

  track.newFormatLogReason = newFormatLogReason;
  // return {track, };
  return { track, availableTracks };
};

module.exports = { generateLogsForTrack };
