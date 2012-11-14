control = {

    startOfWeek: null,
    endOfWeek: null,
    page: 1,
    pages: null,

	init: function(prefix) {
		control.page = 1;
        $('.fullday').empty();
		$('#currentaction h1').html('Fetching recent article');
        var url = prefix || "http://content.guardianapis.com/";
        //  I know getting the date for today is easy, but I want to know what
        //  the Guardian thinks the date is, and I'll do this by getting the most recent
        //  article and then we can work it out from that
        $.getJSON(url+'search.json?page-size=1&callback=?',
            //  TODO: add error checking to this response
            function(json) {
                //  extract the year, month, day part of the webPublicationDate
                var d = json.response.results[0].webPublicationDate.split('T')[0].split('-');
                //  convert it into a proper date object
                d = new Date(parseInt(d[0],10), parseInt(d[1],10)-1, parseInt(d[2],10));
                //  work back to the first day of the week (and just for utility the end of the week)
                control.startOfWeek = new Date(d.getTime());
                control.endOfWeek = new Date(control.startOfWeek.getTime() + (1000*60*60*24*7));

                //  Stupidly long way to display the week we are currently looking at
                $('#topfeedback').html(filtertag + ' published in the week ' + control.startOfWeek.toString().split('00:00:00')[0] + ' - ' + new Date(control.endOfWeek.getTime() - 1000).toString().split('23:59:59')[0]);

                //  Now add the dates onto the top of each row
                control.displayDates();
            }
        );

        $('#sectionFilters input[name=pickSections]').click(function() {
            if ($(this).val() == 'all') {
                if ($(this).attr('checked') == 'checked') {
                    $('#sectionFilters input[name=pickSections]').attr('checked', true);
                } else {
                    $('#sectionFilters input[name=pickSections]').attr('checked', false);
                }
            }

            //  Turn all the thumbs off, then turn them back on again
            $('.thumbholder').css('display', 'none');
            $('#sectionFilters input[name=pickSections]').each(function(i, el) {
                if ($(el).attr('checked') === 'checked') {
                    $('.fullday .section_' + $(el).val()).css('display', 'inline');
                }
                
            });

        });



        /* Draw the background dash objects */
        var x = 0;
        for (var h = 0; h < 24; ++h) {
            // x += utils.ease(h,0,10,18,24)*90;
            x = utils.timetopixel(h*60);

            var todtext = "" + h+ ":00";
            var elem = $('<span>')
                .css('position', 'absolute')
                .css('top', x)
                .css('border-top', '1px black solid')
                .css('width', '60px')
                .html(todtext);
            $('.fullday').append(elem);
        }
        $('.fullday').height(x+15);

	},

    //  this is going to start at the first day and loop over until
    //  we've put all the dates at the top of each day column
    displayDates: function() {
        
        var d = null;
        for (var i = 0; i < 7; i++) {
            d = new Date(this.startOfWeek.getTime() + (1000*60*60*24*i));
            d = d.toString().split(' ');
            $($('#week .dayholder')[i]).children('h6').html(d[2] + ' ' + d[1]);
        }

    },

    fetchFeed: function(apiurl, params) {
        apiurl = apiurl || "http://content.guardianapis.com/";
        params = params || {};
        if (this.pages === null) {
            $('#currentaction h1').html('Counting ' + filtertag);
        } else {
            $('#currentaction h1').html('Counting ' + filtertag + ' ' + this.page + '/' + this.pages);
        }

        var fromdate = (control.startOfWeek.getYear() + 1900) + '-' + (control.startOfWeek.getMonth()+1) + '-' + control.startOfWeek.getDate();
        var todate = (control.endOfWeek.getYear() + 1900) + '-' + (control.endOfWeek.getMonth()+1) + '-' + control.endOfWeek.getDate();
        params["page"] = control.page;
        params["tag"] = filtertag;
        params["from-date"] = fromdate;
        params["to-date"] = todate;
        params["show-tags"] = "series";
        params["order-by"] = "oldest";
        params["format"]="json";
        params["show-fields"]="shortUrl,thumbnail,scheduled-launch-date";
        url = utils.url(apiurl+'search', params);
        utils.log("Fetching from "+url);
        $.getJSON(url+'&callback=?',
            //  TODO: add error checking to this response
            function(json) {
                for (var i in json.response.results) {
                    control.plotVideo(json.response.results[i]);
                }

                //  now we need to see if we should get another page
                control.pages = json.response.pages;
                if (control.page < control.pages) {
                    control.page++;
                    control.fetchFeed(apiurl, params);
                } else {
                    if (json.response.total == 1) {
                        $('#currentaction h1').html('Done, 1 video');
                    } else {
                        control.finishPlotting();
                    }
                }

            }
        );


    },

    plotVideo: function(json) {
        // Ok, now we want to get the scheduled publish date of each video, same as before...
        var contentDate = json.fields.scheduledLaunchDate;
        // The API currently does not return ISO dates for scheduled-date
        // This will be fixed pretty soon, but new Date(string) should parse both
        var d = new Date(contentDate);
        var tod = parseInt(d.getHours()*60,10) + parseInt(d.getMinutes(),10);
        var todpos = utils.timetopixel(tod);

        todpos+=15;

        //  Now we know the day and the time of day, we can add the thumbnail onto the page
        var th = $('<a>')
            .addClass('thumbholder')
            .addClass('section_' + json.sectionId)
            .css('top', todpos-12)
            .attr('href', 'http://www.guardian.co.uk/'+json.id);
        var dtime = $('<div>').addClass('time').addClass('tinyfont').html(d.getHours() + ':' + d.getMinutes());
        var dsection = $('<div>').addClass('sectionname').addClass('tinyfont').html(json.sectionName);

        if (json.tags.length > 0) {
            var dseries = $('<div>').addClass('series').addClass('tinyfont').html('series');
            th.append(dseries);
        }

        th.append(dtime);
        if ('thumbnail' in json.fields) {
            var i = $('<img>')
                .addClass('thumbnail')
                .attr('src', json.fields.thumbnail)
                .attr('title', d.getHours() + ':' + d.getMinutes())
                .attr('style', '');
            th.append(i);
        }
        th.append(dsection);

        $($('#week .dayholder')[d.getDay()]).children('.fullday').append(th);


    },

    finishPlotting: function() {
        $('#currentaction h1').html('Done');
        $('#currentaction').slideUp('slow');

        setTimeout(function() {
            $('.thumbnail').each(function(i, el) {
                if ($(el).css('display') == 'none') {
                    $(el).parent().remove();
                }
            });
        }, 1000);

        $('#sectionFilters').fadeIn(666);
    }

};

utils = {
	url: function(location, params) {
        var s = location;
        var count = 0;
        for (var k in params) {
            if (!params.hasOwnProperty(k)) continue;
            if (count === 0) { s += '?'; } else { s += '&'; }
            count++;
            s += k;
            s += '=';
            s += encodeURIComponent(params[k]);
        }
        return s;
    },
	log: function(msg) {
		try {
			console.log(msg);
		} catch(er) {
			
       }
    },
    sinoid: function(x) { return 3*(x*x) - 2*(x*x*x); },
    ease: function(x, Start, EaseIn, EaseOut, End) {
        if (x < EaseIn) return utils.sinoid(x/EaseIn);
        if (x > EaseOut) return 1.0 - utils.sinoid((x-EaseOut)/(End-EaseOut));
        return 1.0;
    },
    timetopixel: function(t) {
        var pos = 0;
        while (t > 0) {
        pos += utils.ease(t,0,10*60,18*60,24*60)*90;
        t -= 60;
        }
        return pos;
    }
};