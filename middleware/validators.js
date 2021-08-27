module.exports = {
  isValid: (...data) => {
    return new Promise((resolve, reject) => {
      const isValid = !Object.values(...data).includes(null);
      console.log(isValid);
      if (isValid) {
        return resolve(true);
      } else {
        return reject(false);
      }
    });
  },
  availableTrackSearchValidator: (...data) => {
    data = data[0];
    let query = [];

    query.push({isSearch: false});
    for (let key in data) {
      if (data[key] === null || data[key] === '' || data[key] === undefined)
        delete data[key];
    }

    // if (data['type'] == 'available' || data['type'] == 'unavailable') {
    //   query.push({all_pubs: {$in: data['remaining_pubs']}});
    // }

    // titles
    if (data['title']) {
      // query.push({title: new RegExp(data['title'], 'ig')});
      // let titleRegex = data['title'].replace(/['$"]/g, '');
      // console.log({title: titleRegex});
      let escaped = [...data['title']]
        .map((c, i) => {
          const code = c.charCodeAt(0);
          if (code >= 33 && code <= 47) return `\\${c}`;
          if (code >= 58 && code <= 64) return `\\${c}`;
          if (code >= 91 && code <= 96) return `\\${c}`;
          if (code >= 123 && code <= 126) return `\\${c}`;
          return c;
        }).join('');
      console.log({escaped});

      let expression = new RegExp(`${escaped}`, 'ig');
      console.log(expression);
      query.push({title: expression});

      query[0].isSearch = true;
    }

    // genre
    if (data['genre']) {
      query.push({genre: data['genre']});
      // query.push({$text: {$search: data['genre']}});
      // console.log({genre_text: query});

      query[0].isSearch = true;
    }

    // decade
    if (data['decade']) {
      query.push({decade: {$eq: data['decade']}});
      query[0].isSearch = true;
    }

    // BPM
    // console.log(data["bpm_end"]);
    if (data['bpm_start'] !== undefined && data['bpm_end'] !== undefined) {
      query.push({
        bpm: {
          $gte: parseInt(data['bpm_start']),
          $lte: parseInt(data['bpm_end'])
        }
      });
      query[0].isSearch = true;
    }

    // durations
    if (data['duration_start'] && data['duration_end']) {
      let fromDuration = data['duration_start'].split(':').map(item => item);
      let toDuration = data['duration_end'].split(':').map(item => item);
      //   //
      //   console.log(data['duration_end']);
      //   console.log(data['duration_start']);
      //   // console.log('Greater then this minutes', fromDuration[0]);
      //   // console.log('Greater then this seconds', fromDuration[1]);
      //   // console.log('less then this minutes', toDuration[0]);
      //   // console.log('less then this seconds', toDuration[1]);
      query.push({
        duration_minutes: {
          $gte: parseInt(fromDuration[0]),
          $lte: parseInt(toDuration[0])
        }
        //     //   duration_seconds: {
        //     //     $gte: parseInt(fromDuration[1])
        //     //     // $lte: parseInt(toDuration[1])
        //     //   }
        //     // });
        //
        //     // query.push({
        //     //   duration_seconds: {
        //     //     $gte: parseInt(fromDuration[1]),
        //     //     $lte: parseInt(toDuration[1])
        //     //   }
      });
      query[0].isSearch = true;
    }

    // artists
    if (data['artist'] && data['artist'].length) {
      let artists = data['artist'].map(function (e) {
        return new RegExp(e, 'i');
      });
      // let artists = data['artist'];

      query.push({
        artist: {
          $in: artists
        }
      });
      query[0].isSearch = true;
    }

    // console.log({query});
    return query;
  }
};
