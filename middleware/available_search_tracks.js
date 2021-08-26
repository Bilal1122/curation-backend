// Models
const AvailableTracks = require('../models/AvailableTracks');

async function getTracksWithoutFilters (
  query,
  skip,
  limit,
  groupPublishers,
  label_list,
  pro_list,
  type,
  duration_start,
  duration_end,
  filterPreferences,
  data = []
) {
  let fromDuration = [];
  let toDuration = [];
  if (duration_start && duration_end) {

    fromDuration = duration_start
      .split(':')
      .map(item => parseInt(item));
    toDuration = duration_end.split(':').map(item => parseInt(item));
  }
  let allAvailableTracks = await AvailableTracks.find(query)
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .lean()
    .collation({locale: 'en', strength: 1})
    .catch(err => {
      console.log(err);
      return null;
    });

  if (allAvailableTracks) {
    // assign all tracks to false

    // return allAvailableTracks
    if (!allAvailableTracks.length) return data;

    if (duration_start && duration_end) {


      for (let i = 0; i < allAvailableTracks.length; i++) {
        if (duration_start && duration_end) {

          let fromSeconds = (fromDuration[0] * 60) + fromDuration[1];
          let toSeconds = (toDuration[0] * 60) + toDuration[1];

          let trackSeconds = (allAvailableTracks[i].duration_minutes * 60) + allAvailableTracks[i].duration_seconds;
          let durationMatch = trackSeconds >= fromSeconds && trackSeconds <= toSeconds;

          console.log(`---------------${i}----------------`);

          console.log({fromSeconds});
          console.log({trackSeconds});
          console.log({toSeconds});
          console.log(durationMatch);


          if (durationMatch == false) {
            console.log('Match', allAvailableTracks[i]);
            allAvailableTracks.splice(i, 1);
            i--;
          }
        }
      }
    }
    data.push(...allAvailableTracks);

    console.log(groupPublishers, '<----- groupPublishers')
    console.log(label_list, '<----- group labels')
    console.log(pro_list, '<----- group pro')
    console.log(filterPreferences.userLabelFilter, '<----- islabel')
    // TODO: this loop should be parent of all check (publishers, label, pro)
    let misMatchPublisherList = []
    for (let i = 0; i < data.length; i++) {
      if (data[i] == undefined) break;
      if (filterPreferences.userPublisherFilter) { // TODO: publishers matching
        let total_share = 0;
        let pubsMisMatched = [];
        console.log(data[i].publishers && Object.keys(data[i].publishers))
        data[i].publishers && Object.keys(data[i].publishers).forEach((item) => !groupPublishers.includes(item) ? misMatchPublisherList.push(item) : null)
        if (misMatchPublisherList.length) {
          data[i].matchWithLocalTracks = false;
          data[i].pubMisMatch = true;
          data[i].logReason = [{
            type: 'Publishers mismatch',
            mismatchedItems: [...misMatchPublisherList]
          }]
          continue;
        }
        for (let j = 0; j < groupPublishers.length; j++) {
          if (data[i].publishers && data[i].publishers[groupPublishers[j]]) {
            // split publishers from tracks to get percentage share
            // console.log(groupPublishers[j], data[i].publishers[groupPublishers[j]]);
            let number = parseFloat(
              data[i].publishers[groupPublishers[j]].split('%')[0] * 1
            );
            total_share += number;
            if (total_share == 100) {
              data[i].matchWithLocalTracks = true;
              break;
            }
            else {
              data[i].matchWithLocalTracks = false;
              data[i].pubMisMatch = true;
            }
          }
        }
        if (pubsMisMatched.length) console.log('track with mismatch pubs----->', data[i], '\n mismatchpubs--:', pubsMisMatched)
        // console.log("------------------", total_share);
      }
      else if (filterPreferences.userLabelFilter) { // TODO: label matching
        if (label_list.includes(data[i].label)) {
          console.log(data[i].label)
          data[i].labelMatch = true;
          data[i].matchWithLocalTracks = true;
        }
        else {
          data[i].labelMatch = false;
          data[i].matchWithLocalTracks = false;
          data[i].logReason = [{
            type: 'Label mismatch',
            mismatchedItems: [data[i].label]
          }]
        }
      }
      else if (filterPreferences.userPROFilter) { // TODO: pro matching
        if (pro_list.includes(data[0].PRO)) {
          console.log(data[i].PRO)
          data[i].labelMatch = true;
          data[i].matchWithLocalTracks = true;
        }
        else {
          data[i].labelMatch = false;
          data[i].matchWithLocalTracks = false;
          data[i].logReason = [{
            type: 'pro mismatch',
            mismatchedItems: [data[i].PRO]
          }]
        }
      }
    }


    if (type == 'available') {
      data = data.filter(item => item.matchWithLocalTracks);
      // console.log("available", data);
      // console.log(data.length);
      if (data.length >= 10) {
        return data;
      }
      else {
        console.count('ran');

        return await getTracksWithoutFilters(
          query,
          parseInt(skip) + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          data
        );
      }
    }
    // type is unavailable
    else if (type == 'unavailable') {
      data = data.filter(item => !item.matchWithLocalTracks);
      if (data.length >= 10) {
        return data;
      }
      else {
        console.count('unavailable');
        // console.log(data.length);
        return await getTracksWithoutFilters(
          query,
          parseInt(skip) + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          data
        );
      }
    }
    else {
      if (data.length >= 10) {
        return data;
      }
      else {
        console.count('ALl');
        // console.log(data.length);
        return await getTracksWithoutFilters(
          query,
          parseInt(skip) + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          data
        );
      }
    }
  }
  else {
    return null;
  }
}

async function getTracksWithFilters (
  query,
  skip,
  limit,
  groupPublishers,
  label_list,
  pro_list,
  type,
  duration_start,
  duration_end,
  filterPreferences,
  finalResults = []
) {
  console.log({limit}, {skip});

  let fromDuration = [];
  let toDuration = [];

  if (duration_start && duration_end) {
    fromDuration = duration_start
      .split(':')
      .map(item => parseInt(item));
    toDuration = duration_end.split(':').map(item => parseInt(item));
  }

  let countOfTrackAll = await AvailableTracks.countDocuments();

  let examine = await AvailableTracks.find(query).explain();

  console.log('returned', examine[0].executionStats.nReturned);
  let allAvailableTracks = [];

  if (examine[0].executionStats.nReturned > 100) {
    allAvailableTracks = await AvailableTracks.find(query)
      .limit(limit)
      .skip(skip)
      .lean()
      .catch(err => {
        console.log(err);
        return null;
      });
  }
  else {
    allAvailableTracks = await AvailableTracks.find(query)
      // .limit(limit)
      .skip(skip)
      .lean()
      .catch(err => {
        console.log(err);
        return null;
      });
  }


  console.log('All found available tracks count', allAvailableTracks.length);

  if (allAvailableTracks) {

    // if (!allAvailableTracks.length) return allAvailableTracks;
    if (!examine[0].executionStats.nReturned && !allAvailableTracks.length) return finalResults;
    if (!allAvailableTracks.length && skip >= countOfTrackAll) return finalResults;
    if (finalResults.length && !allAvailableTracks.length) return finalResults;
    if (finalResults.length === examine[0].executionStats.nReturned) return finalResults;

    let misMatchPublisherList = []

    for (let i = 0; i < allAvailableTracks.length; i++) {
      let total_share = 0;
      if (duration_start && duration_end) {

        let fromSeconds = (fromDuration[0] * 60) + fromDuration[1];
        let toSeconds = (toDuration[0] * 60) + toDuration[1];

        let trackSeconds = (allAvailableTracks[i].duration_minutes * 60) + allAvailableTracks[i].duration_seconds;
        let durationMatch = trackSeconds >= fromSeconds && trackSeconds <= toSeconds;

        // console.log(`---------------${i}----------------`);

        console.log({fromSeconds});
        console.log({trackSeconds});
        console.log({toSeconds});
        console.log(durationMatch);


        if (durationMatch == false) {
          console.log('Match', allAvailableTracks[i]);
          allAvailableTracks.splice(i, 1);
          i--;
          continue;
        }
      }
      if (filterPreferences.userPublisherFilter) { // TODO: publishers matching
        let pubsMisMatched = [];

        for (let j = 0; j < groupPublishers.length; j++) {

          if (allAvailableTracks[i].publishers && allAvailableTracks[i].publishers[groupPublishers[j]]) {
            let number = parseFloat(
              allAvailableTracks[i].publishers[groupPublishers[j]].split('%')[0] *
              1
            );
            total_share += number;

            if (total_share == 100) {
              allAvailableTracks[i].matchWithLocalTracks = true;
              break;
            }
            else {
              allAvailableTracks[i].matchWithLocalTracks = false;
            }
          }
          else {
            allAvailableTracks[i].matchWithLocalTracks = false;
          }
        }
      }
      else if (filterPreferences.userLabelFilter) { // TODO: label matching
        if (label_list.includes(allAvailableTracks[i].label)) {
          console.log(allAvailableTracks[i].label)
          allAvailableTracks[i].labelMatch = true;
          allAvailableTracks[i].matchWithLocalTracks = true;
        }
        else {
          allAvailableTracks[i].labelMatch = false;
          allAvailableTracks[i].matchWithLocalTracks = false;
          allAvailableTracks[i].logReason = [{
            type: 'Label mismatch',
            mismatchedItems: [allAvailableTracks[i].label]
          }]
        }
      }
      else if (filterPreferences.userPROFilter) { // TODO: pro matching
        if (pro_list.includes(allAvailableTracks[0].PRO)) {
          allAvailableTracks[i].labelMatch = true;
          allAvailableTracks[i].matchWithLocalTracks = true;
        }
        else {
          allAvailableTracks[i].labelMatch = false;
          allAvailableTracks[i].matchWithLocalTracks = false;
          allAvailableTracks[i].logReason = [{
            type: 'pro mismatch',
            mismatchedItems: !allAvailableTracks[i].PRO.length ? ['No pro available'] : [allAvailableTracks[i].PRO]
          }]
          console.log(allAvailableTracks[i])
        }
      }

      if (type == 'unavailable' && !allAvailableTracks[i].matchWithLocalTracks) {
        finalResults.push(allAvailableTracks[i]);
      }
      else if (type == 'available' && allAvailableTracks[i].matchWithLocalTracks) {
        console.log('available');
        finalResults.push(allAvailableTracks[i]);
      }
      else if (type != 'available' && type != 'unavailable') {
        // console.log("ALL");
        finalResults.push(allAvailableTracks[i]);
      }

      if (finalResults.length >= 10) {
        break;
      }
      // console.log(`-----${i}----`);

      if (finalResults.length < 10 && i == allAvailableTracks.length - 1) {
        console.log('Inside final result length', finalResults.length);
        await getTracksWithFilters(
          query,
          skip + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          finalResults
        );
      }
    }

    if (finalResults.length < 10) {
      console.log('Outside final result length', finalResults.length);
      await getTracksWithFilters(
        query,
        skip + limit,
        limit,
        groupPublishers,
        label_list,
        pro_list,
        type,
        duration_start,
        duration_end,
        filterPreferences,
        finalResults
      );
    }
    return finalResults;
  }
}


async function getTracksWithFiltersLogs (
  query,
  skip,
  limit,
  groupPublishers,
  label_list,
  pro_list,
  type,
  duration_start,
  duration_end,
  filterPreferences,
  finalResults = []
) {
  let fromDuration = [];
  let toDuration = [];

  if (duration_start && duration_end) {
    fromDuration = duration_start
      .split(':')
      .map(item => parseInt(item));
    toDuration = duration_end.split(':').map(item => parseInt(item));
  }

  let countOfTrackAll = await AvailableTracks.countDocuments();

  let examine = await AvailableTracks.find(query).explain();

  let allAvailableTracks = [];

  if (examine[0].executionStats.nReturned > 100) {
    allAvailableTracks = await AvailableTracks.find(query)
      .limit(limit)
      .skip(skip)
      .lean()
      .catch(err => {
        console.log(err);
        return null;
      });
  }
  else {
    allAvailableTracks = await AvailableTracks.find(query)
      // .limit(limit)
      .skip(skip)
      .lean()
      .catch(err => {
        console.log(err);
        return null;
      });
  }



  if (allAvailableTracks) {

    // if (!allAvailableTracks.length) return allAvailableTracks;
    if (!examine[0].executionStats.nReturned && !allAvailableTracks.length) return finalResults;
    if (!allAvailableTracks.length && skip >= countOfTrackAll) return finalResults;
    if (finalResults.length && !allAvailableTracks.length) return finalResults;
    if (finalResults.length === examine[0].executionStats.nReturned) return finalResults;


    for (let i = 0; i < allAvailableTracks.length; i++) {
      let isTrackNotAvailable = false
      let total_share = 0;
      let labelUnMatchString = 'Label('
      let proUnMatchString = 'Pro(';
      let publisherUnMatchString = 'Publishers('
      allAvailableTracks[i].newFormatLogReason = {}
      let misMatchPublisherList = [];

      if (duration_start && duration_end) {

        let fromSeconds = (fromDuration[0] * 60) + fromDuration[1];
        let toSeconds = (toDuration[0] * 60) + toDuration[1];

        let trackSeconds = (allAvailableTracks[i].duration_minutes * 60) + allAvailableTracks[i].duration_seconds;
        let durationMatch = trackSeconds >= fromSeconds && trackSeconds <= toSeconds;

        // console.log(`---------------${i}----------------`);

        if (durationMatch == false) {
          console.log('Match', allAvailableTracks[i]);
          allAvailableTracks.splice(i, 1);
          i--;
          continue;
        }
      }


      if (filterPreferences.userPublisherFilter) { // TODO: publishers matching
        let pubsMisMatched = [];

        for (let j = 0; j < groupPublishers.length; j++) {

          if (allAvailableTracks[i].publishers && allAvailableTracks[i].publishers[groupPublishers[j]]) {
            let number = parseFloat(
              allAvailableTracks[i].publishers[groupPublishers[j]].split('%')[0] *
              1
            );
            total_share += number;

            if (total_share == 100) {
              allAvailableTracks[i].matchWithLocalTracks = true;
              break;
            }
            else {
              allAvailableTracks[i].matchWithLocalTracks = false;
            }
          }
          else {
            allAvailableTracks[i].matchWithLocalTracks = false;
          }
        }
        // TODO: missing publishers check
        if (allAvailableTracks[i].publishers) {
          console.log(groupPublishers, "././././.")
          let allTrackPublishers = Object.keys(allAvailableTracks[i].publishers);
          allTrackPublishers.forEach(
            (item) => !groupPublishers.includes(item) ? pubsMisMatched.push(item) : null)
        }
        if (pubsMisMatched.length) {
          allAvailableTracks[i].matchWithLocalTracks = false;
          allAvailableTracks[i].pubMisMatch = false;
          pubsMisMatched.forEach(item => publisherUnMatchString += `${item}(${allAvailableTracks[i].publishers[item]}) `)
          publisherUnMatchString += ')'
          allAvailableTracks[i].newFormatLogReason.publisher = publisherUnMatchString
          isTrackNotAvailable = true
        }
      }
      if (filterPreferences.userLabelFilter) { // label matching  && allAvailableTracks[i].label.length
        if (!isTrackNotAvailable && label_list.includes(allAvailableTracks[i].label)) {
          console.log(allAvailableTracks[i].label)
          allAvailableTracks[i].labelMatch = true;
          allAvailableTracks[i].matchWithLocalTracks = true;
        }
        else {
          allAvailableTracks[i].labelMatch = false;
          allAvailableTracks[i].matchWithLocalTracks = false;
          allAvailableTracks[i].logReason = [{
            type: 'Label mismatch',
            mismatchedItems: [allAvailableTracks[i].label]
          }]
          allAvailableTracks[i].newFormatLogReason.label = labelUnMatchString + `${allAvailableTracks[i].label})`
          isTrackNotAvailable = true
        }
      }
      if (filterPreferences.userPROFilter ) { // pro matching
        if (!isTrackNotAvailable && pro_list.includes(allAvailableTracks[0].PRO)) {
          allAvailableTracks[i].labelMatch = true;
          allAvailableTracks[i].matchWithLocalTracks = true;
        }
        else {
          allAvailableTracks[i].labelMatch = false;
          allAvailableTracks[i].matchWithLocalTracks = false;
          allAvailableTracks[i].logReason = [{
            type: 'pro mismatch',
            mismatchedItems: !allAvailableTracks[i].PRO.length ? ['No pro available'] : [allAvailableTracks[i].PRO]
          }]
          allAvailableTracks[i].newFormatLogReason.pro = proUnMatchString + `${allAvailableTracks[i].PRO})`
          isTrackNotAvailable = true
        }
      }

      if (!filterPreferences.userPublisherFilter && !filterPreferences.userLabelFilter && !filterPreferences.userPROFilter ){
        allAvailableTracks[i].matchWithLocalTracks = false;
        allAvailableTracks[i].newFormatLogReason.publisher = ''
        allAvailableTracks[i].newFormatLogReason.label = ''
        allAvailableTracks[i].newFormatLogReason.pro = ''
        isTrackNotAvailable = true
      }

      console.log('-------------newFormatLogReason--------->>', allAvailableTracks[i].newFormatLogReason, 'name:', allAvailableTracks[i].title)

      if (type == 'unavailable' && !allAvailableTracks[i].matchWithLocalTracks) {
        finalResults.push(allAvailableTracks[i]);
      }
      else if (type == 'available' && allAvailableTracks[i].matchWithLocalTracks) {
        console.log('available');
        finalResults.push(allAvailableTracks[i]);
      }
      else if (type != 'available' && type != 'unavailable') {
        // console.log("ALL");
        finalResults.push(allAvailableTracks[i]);
      }

      if (finalResults.length >= 10) {
        break;
      }
      // console.log(`-----${i}----`);

      if (finalResults.length < 10 && i == allAvailableTracks.length - 1) {
        console.log('Inside final result length', finalResults.length);
        await getTracksWithFilters(
          query,
          skip + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          finalResults
        );
      }
    }

    if (finalResults.length < 10) {
      console.log('Outside final result length', finalResults.length);
      await getTracksWithFilters(
        query,
        skip + limit,
        limit,
        groupPublishers,
        label_list,
        pro_list,
        type,
        duration_start,
        duration_end,
        filterPreferences,
        finalResults
      );
    }
    return finalResults;
  }
}

async function getTracksWithoutFiltersLogs (
  query,
  skip,
  limit,
  groupPublishers,
  label_list,
  pro_list,
  type,
  duration_start,
  duration_end,
  filterPreferences,
  data = []
) {
  let fromDuration = [];
  let toDuration = [];
  if (duration_start && duration_end) {

    fromDuration = duration_start
      .split(':')
      .map(item => parseInt(item));
    toDuration = duration_end.split(':').map(item => parseInt(item));
  }
  let allAvailableTracks = await AvailableTracks.find(query)
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .lean()
    .collation({locale: 'en', strength: 1})
    .catch(err => {
      console.log(err);
      return null;
    });

  // let examine = await AvailableTracks.find(query).explain();
  // console.log('returned==================', examine[0].executionStats.nReturned);

  if (allAvailableTracks) {
    // assign all tracks to false

    // return allAvailableTracks
    if (!allAvailableTracks.length) return data;

    if (duration_start && duration_end) {


      for (let i = 0; i < allAvailableTracks.length; i++) {
        if (duration_start && duration_end) {

          let fromSeconds = (fromDuration[0] * 60) + fromDuration[1];
          let toSeconds = (toDuration[0] * 60) + toDuration[1];

          let trackSeconds = (allAvailableTracks[i].duration_minutes * 60) + allAvailableTracks[i].duration_seconds;
          let durationMatch = trackSeconds >= fromSeconds && trackSeconds <= toSeconds;

          console.log(`---------------${i}----------------`);

          console.log({fromSeconds});
          console.log({trackSeconds});
          console.log({toSeconds});
          console.log(durationMatch);


          if (durationMatch == false) {
            console.log('Match', allAvailableTracks[i]);
            allAvailableTracks.splice(i, 1);
            i--;
          }
        }
      }
    }
    data.push(...allAvailableTracks);

    console.log(groupPublishers, '<----- groupPublishers')
    console.log(label_list, '<----- group labels')
    console.log(pro_list, '<----- group pro')
    console.log(filterPreferences.userLabelFilter, '<----- islabel')
    // TODO: this loop should be parent of all check (publishers, label, pro)
    for (let i = 0; i < data.length; i++) {
      let misMatchPublisherList = []
      if (data[i] == undefined) break;
      let labelUnMatchString = 'Label('
      let proUnMatchString = 'Pro(';
      let publisherUnMatchString = 'Publishers('
      data[i].newFormatLogReason = {};
      let isTrackNotAvailable = false

      let total_share = 0;
      if (filterPreferences.userPublisherFilter) { // TODO: publishers matching do something with this
        data[i].publishers && Object.keys(data[i].publishers).forEach((item) => !groupPublishers.includes(item) ? misMatchPublisherList.push(item) : null)
        if (misMatchPublisherList.length) {
          data[i].matchWithLocalTracks = false;
          data[i].pubMisMatch = false;
          data[i].logReason = [{
            type: 'Publishers mismatch',
            mismatchedItems: [...misMatchPublisherList]
          }]
          misMatchPublisherList.forEach(item => publisherUnMatchString += `${item}(${data[i].publishers[item]}) `)
          publisherUnMatchString += ')'
          data[i].newFormatLogReason.publisher = publisherUnMatchString
          isTrackNotAvailable = true
        }
        // else {
        if (!misMatchPublisherList.length) {
          for (let j = 0; j < groupPublishers.length; j++) {
            if (data[i].publishers && data[i].publishers[groupPublishers[j]]) {
              // split publishers from tracks to get percentage share
              // console.log(groupPublishers[j], data[i].publishers[groupPublishers[j]]);
              let number = parseFloat(
                data[i].publishers[groupPublishers[j]].split('%')[0] * 1
              );
              total_share += number;
              if (total_share == 100) {
                data[i].matchWithLocalTracks = true;
                break;
              }
              else {
                data[i].matchWithLocalTracks = false;
                data[i].pubMisMatch = true;
              }
            }
          }
        }
        // }
        // if (pubsMisMatched.length) console.log('track with mismatch pubs----->', data[i], '\n mismatchpubs--:',
        // pubsMisMatched) console.log("------------------", total_share);
      }
      if (filterPreferences.userLabelFilter) { // TODO: label matching
      // && data[i].label.length
        if (isTrackNotAvailable === false && label_list.includes(data[i].label) && data[i].label.length) {
          console.log(data[i].label)
          data[i].labelMatch = true;
          data[i].matchWithLocalTracks = true;
        }
        else {
          data[i].labelMatch = false;
          data[i].matchWithLocalTracks = false;
          data[i].logReason = [{
            type: 'Label mismatch',
            mismatchedItems: [data[i].label]
          }]
          data[i].newFormatLogReason.label = labelUnMatchString + `${data[i].label})`
          isTrackNotAvailable = true
        }
      }
      if (filterPreferences.userPROFilter ) { // TODO: pro matchings
        console.log(data[i].PRO, isTrackNotAvailable === false, pro_list.includes(data[0].PRO), '===<<<')
        if (isTrackNotAvailable === false && pro_list.includes(data[0].PRO) && data[i].PRO.length) {
          data[i].labelMatch = true;
          data[i].matchWithLocalTracks = true;
        }
        else {
          data[i].labelMatch = false;
          data[i].matchWithLocalTracks = false;
          data[i].logReason = [{
            type: 'pro mismatch',
            mismatchedItems: [data[i].PRO]
          }]
          data[i].newFormatLogReason.pro = proUnMatchString + `${data[i].PRO})`
          isTrackNotAvailable = true
        }
      }

      if (!filterPreferences.userPublisherFilter && !filterPreferences.userLabelFilter && !filterPreferences.userPROFilter ){
        data[i].matchWithLocalTracks = false;
        data[i].newFormatLogReason.publisher = ''
        data[i].newFormatLogReason.label = ''
        data[i].newFormatLogReason.pro = ''
        isTrackNotAvailable = true
      }
      console.log('-------------newFormatLogReason--------->>', data[i].newFormatLogReason, 'name:', data[i].title)

    }


    if (type == 'available') {
      data = data.filter(item => item.matchWithLocalTracks);
      // console.log("available", data);
      // console.log(data.length);
      if (data.length >= 10) {
        return data;
      }
      else {
        console.count('ran');

        return await getTracksWithoutFilters(
          query,
          parseInt(skip) + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          data
        );
      }
    }
    // type is unavailable
    else if (type == 'unavailable') {
      data = data.filter(item => !item.matchWithLocalTracks);
      if (data.length >= 10) {
        return data;
      }
      else {
        console.count('unavailable');
        // console.log(data.length);
        return await getTracksWithoutFilters(
          query,
          parseInt(skip) + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          data
        );
      }
    }
    else {
      if (data.length >= 10) {
        return data;
      }
      else {
        console.count('ALl');
        // console.log(data.length);
        return await getTracksWithoutFilters(
          query,
          parseInt(skip) + limit,
          limit,
          groupPublishers,
          label_list,
          pro_list,
          type,
          duration_start,
          duration_end,
          filterPreferences,
          data
        );
      }
    }
  }
  else {
    return null;
  }
}

// methods
module.exports = {
  getTracksWithoutFiltersLogs,
  getTracksWithFiltersLogs
};
