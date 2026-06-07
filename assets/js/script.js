(function($) {
	
	"use strict";
	
	//Hide Loading Box (Preloader)
	function handlePreloader() {
		if($('.loader-wrap').length){
			$('.loader-wrap').delay(1000).fadeOut(500);
		}
	}

	if ($(".preloader-close").length) {
        $(".preloader-close").on("click", function(){
            $('.loader-wrap').delay(200).fadeOut(500);
        })
    }
	
	//Update Header Style and Scroll to Top
	function headerStyle() {
		if($('.main-header').length){
			var windowpos = $(window).scrollTop();
			var siteHeader = $('.main-header');
			var scrollLink = $('.scroll-top');
			if (windowpos >= 110) {
				siteHeader.addClass('fixed-header');
				scrollLink.addClass('open');
			} else {
				siteHeader.removeClass('fixed-header');
				scrollLink.removeClass('open');
			}
		}
	}
	
	headerStyle();


	//Submenu Dropdown Toggle
	if($('.main-header .navigation li.dropdown').length){
		$('.main-header .navigation li.dropdown').each(function() {
			var $item = $(this);
			if ($item.children('.dropdown-btn').length === 0) {
				$item.append('<div class="dropdown-btn" role="button" tabindex="0" aria-label="Toggle submenu"><span class="fas fa-angle-down"></span></div>');
			}
		});
	}

	//Mobile Nav Hide Show
	if($('.mobile-menu').length){
		
		$('.mobile-menu .menu-box').mCustomScrollbar();
		$('.mobile-menu .menu-box').attr('aria-hidden', 'true');
		
		var mobileMenuContent = $('.main-header .menu-area .main-menu').html();
		$('.mobile-menu .menu-box .menu-outer').append(mobileMenuContent);
		$('.sticky-header .main-menu').append(mobileMenuContent);

		function initMobileDropdowns() {
			$('.mobile-menu li.dropdown, .mobile-menu li.platform-menu').each(function(index) {
				var $item = $(this);
				if ($item.hasClass('platform-menu') && !$item.hasClass('dropdown')) {
					$item.addClass('dropdown');
				}
				var $target = $item.children('ul, .megamenu, .blogs-megamenu, .platform-megamenu').first();
				var $btn = $item.children('.dropdown-btn');
				if ($btn.length === 0) {
					$btn = $('<div class="dropdown-btn" role="button" tabindex="0" aria-label="Toggle submenu" aria-expanded="false"><span class="fas fa-angle-down"></span></div>');
					var $anchor = $item.children('a').first();
					if ($anchor.length) {
						$btn.insertAfter($anchor);
					} else {
						$item.append($btn);
					}
				}
				if ($target.length && !$target.attr('id')) {
					$target.attr('id', 'mobile-submenu-' + index);
				}
				if ($target.length) {
					$btn.attr('aria-controls', $target.attr('id'));
				}
				if (!$btn.hasClass('open') && $target.length) {
					$target.hide();
					$btn.attr('aria-expanded', 'false');
				}
			});
		}
		initMobileDropdowns();

		// Convert desktop megamenu HTML into clean mobile link lists.
		// Runs once on page load; initMobileDropdowns() re-runs safely (containers preserved).
		var mobileMenusBuilt = false;
		function buildMobileMegaMenus() {
			if (mobileMenusBuilt) { return; }
			mobileMenusBuilt = true;

			// ── Platform ──────────────────────────────────────────────────────
			var $pm = $('.mobile-menu .platform-megamenu');
			if ($pm.length) {
				var pmHtml = '<ul class="mobile-sub-nav">';
				$pm.find('.platform-card').each(function() {
					pmHtml += '<li><a href="' + ($(this).attr('href') || '#') + '">' + $(this).find('h4').text() + '</a></li>';
				});
				$pm.html(pmHtml + '</ul>');
			}

			// ── CloudSignals+RiskOps ─────────────────────────────────────────
			var $cs = $('.mobile-menu .cs-product-megamenu');
			if ($cs.length) {
				var csHtml = '<ul class="mobile-sub-nav">';
				$cs.find('.cs-mega-col').each(function() {
					var lbl = $(this).find('.cs-mega-col-label').text();
					if (lbl) { csHtml += '<li class="msn-section">' + lbl + '</li>'; }
					$(this).find('.cs-mega-feat-card').each(function() {
						csHtml += '<li><a href="' + ($(this).attr('href') || '#') + '">' + $(this).find('strong').text() + '</a></li>';
					});
				});
				csHtml += '<li class="msn-ctas">'
					+ '<a href="cloudsignals-pricing.html" class="msn-btn-primary">Compare plans &amp; pricing</a>'
					+ '<a href="request-demo.html" class="msn-btn-ghost">Request a demo</a>'
					+ '</li></ul>';
				$cs.html(csHtml);
			}

			// ── Portfolio (tabbed megamenu) ────────────────────────────────────
			var $mm = $('.mobile-menu .megamenu');
			if ($mm.length) {
				var mmHtml = '<ul class="mobile-sub-nav">';
				var spLinks = '';
				$mm.find('[data-mega-tabpanel="solution"] .mega-card').each(function() {
					spLinks += '<li><a href="' + ($(this).attr('href') || '#') + '">' + $(this).find('strong').text() + '</a></li>';
				});
				if (spLinks) { mmHtml += '<li class="msn-section">Products</li>' + spLinks + '<li class="msn-view-all"><a href="solutions-portal.html">View all solutions &rarr;</a></li>'; }
				var ucLinks = '';
				$mm.find('[data-mega-tabpanel="usecase"] .mega-card').each(function() {
					ucLinks += '<li><a href="' + ($(this).attr('href') || '#') + '">' + $(this).find('strong').text() + '</a></li>';
				});
				if (ucLinks) { mmHtml += '<li class="msn-section">Use Cases</li>' + ucLinks; }
				var ouLinks = '';
				$mm.find('[data-mega-tabpanel="otherusecase"] .mega-card').each(function() {
					ouLinks += '<li><a href="' + ($(this).attr('href') || '#') + '">' + $(this).find('strong').text() + '</a></li>';
				});
				if (ouLinks) { mmHtml += '<li class="msn-section">Industry &amp; Partners</li>' + ouLinks; }
				$mm.html(mmHtml + '</ul>');
			}

			// ── Launch For Free CTA below logo ───────────────────────────────
			if (!$('.mobile-menu .msn-launch-cta').length) {
				$('.mobile-menu .nav-logo').after(
					'<div class="msn-launch-cta">'
					+ '<a href="https://gcp-defense.aivric.com/sign-up?plan=pkg-cloudsignals-free&source=aivric_website" class="msn-launch-btn">'
					+ '<i class="fas fa-rocket"></i> Launch For Free'
					+ '</a></div>'
				);
			}
		}
		buildMobileMegaMenus();

		//Dropdown Button
		$('.mobile-menu .dropdown-btn').off('click').on('click', function() {
			var $btn = $(this);
			var $li = $btn.closest('li');
			var $panel = $li.children('ul, .megamenu, .blogs-megamenu, .platform-megamenu').first();
			$btn.toggleClass('open');
			$panel.slideToggle(500);
			var isOpen = $btn.hasClass('open');
			$btn.attr('aria-expanded', isOpen ? 'true' : 'false');
		});
		$('.mobile-menu .dropdown-btn').off('keydown').on('keydown', function(event) {
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				$(this).trigger('click');
			}
		});
		//Menu Toggle Btn
		$('.mobile-nav-toggler').on('click', function() {
			$('body').addClass('mobile-menu-visible');
			$('.mobile-menu .menu-box').attr('aria-hidden', 'false');
			initMobileDropdowns();
			var $focusTarget = $('.mobile-menu .close-btn');
			if ($focusTarget.length) {
				setTimeout(function() { $focusTarget.focus(); }, 0);
			}
		});

		//Menu Toggle Btn
		$('.mobile-menu .menu-backdrop,.mobile-menu .close-btn').on('click', function() {
			$('body').removeClass('mobile-menu-visible');
			$('.mobile-menu .menu-box').attr('aria-hidden', 'true');
		});

		$(document).on('keydown', function(event) {
			if (!$('body').hasClass('mobile-menu-visible')) {
				return;
			}
			if (event.key !== 'Tab') {
				return;
			}
			var $focusable = $('.mobile-menu .menu-box').find('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').filter(':visible');
			if (!$focusable.length) {
				return;
			}
			var first = $focusable[0];
			var last = $focusable[$focusable.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		});
	}


	// Scroll to a Specific Div
	if($('.scroll-to-target').length){
		$(".scroll-to-target").on('click', function() {
			var target = $(this).attr('data-target');
		   // animate
		   $('html, body').animate({
			   scrollTop: $(target).offset().top
			 }, 1000);
	
		});
	}

	// Elements Animation
	if($('.wow').length){
		var wow = new WOW({
		mobile:       false
		});
		wow.init();
	}

	//Contact Form Validation
	if($('#contact-form').length){
		$('#contact-form').validate({
			rules: {
				username: {
					required: true
				},
				email: {
					required: true,
					email: true
				},
				phone: {
					required: true
				},
				subject: {
					required: true
				},
				message: {
					required: true
				}
			}
		});
	}

	//Fact Counter + Text Count
	if($('.count-box').length){
		$('.count-box').appear(function(){
	
			var $t = $(this),
				n = $t.find(".count-text").attr("data-stop"),
				r = parseInt($t.find(".count-text").attr("data-speed"), 10);
				
			if (!$t.hasClass("counted")) {
				$t.addClass("counted");
				$({
					countNum: $t.find(".count-text").text()
				}).animate({
					countNum: n
				}, {
					duration: r,
					easing: "linear",
					step: function() {
						$t.find(".count-text").text(Math.floor(this.countNum));
					},
					complete: function() {
						$t.find(".count-text").text(this.countNum);
					}
				});
			}
			
		},{accY: 0});
	}


	//LightBox / Fancybox
	if($('.lightbox-image').length) {
		$('.lightbox-image').fancybox({
			openEffect  : 'fade',
			closeEffect : 'fade',
			helpers : {
				media : {}
			}
		});
	}


	//Tabs Box
	if($('.tabs-box').length){
		$('.tabs-box .tab-buttons .tab-btn').on('click', function(e) {
			e.preventDefault();
			var target = $($(this).attr('data-tab'));
			
			if ($(target).is(':visible')){
				return false;
			}else{
				target.parents('.tabs-box').find('.tab-buttons').find('.tab-btn').removeClass('active-btn');
				$(this).addClass('active-btn');
				target.parents('.tabs-box').find('.tabs-content').find('.tab').fadeOut(0);
				target.parents('.tabs-box').find('.tabs-content').find('.tab').removeClass('active-tab');
				$(target).fadeIn(100);
				$(target).addClass('active-tab');
			}
		});
	}



	//Accordion Box
	if($('.accordion-box').length){
		$(".accordion-box").on('click', '.acc-btn', function() {
			
			var outerBox = $(this).parents('.accordion-box');
			var target = $(this).parents('.accordion');
			
			if($(this).hasClass('active')!==true){
				$(outerBox).find('.accordion .acc-btn').removeClass('active');
			}
			
			if ($(this).next('.acc-content').is(':visible')){
				return false;
			}else{
				$(this).addClass('active');
				$(outerBox).children('.accordion').removeClass('active-block');
				$(outerBox).find('.accordion').children('.acc-content').slideUp(300);
				target.addClass('active-block');
				$(this).next('.acc-content').slideDown(300);	
			}
		});	
	}


	// banner-carousel
	if ($('.banner-carousel').length) {
        $('.banner-carousel').owlCarousel({
            loop:true,
			margin:0,
			nav:false,
			animateOut: 'fadeOut',
    		animateIn: 'fadeIn',
    		active: true,
			smartSpeed: 1000,
			autoplay: 6000,
            navText: [ '<span class="icon-5"></span>', '<span class="icon-6"></span>' ],
            responsive:{
                0:{
                    items:1
                },
                600:{
                    items:1
                },
                800:{
                    items:1
                },
                1024:{
                    items:1
                }
            }
        });
    }


    // single-item-carousel
	if ($('.single-item-carousel').length) {
		$('.single-item-carousel').owlCarousel({
			loop:true,
			margin:30,
			nav:true,
			smartSpeed: 500,
			autoplay: 1000,
			navText: [ '<span class="icon-16"></span>', '<span class="icon-15"></span>' ],
			responsive:{
				0:{
					items:1
				},
				480:{
					items:1
				},
				600:{
					items:1
				},
				800:{
					items:1
				},			
				1200:{
					items:1
				}

			}
		});    		
	}


	// two-item-carousel
	if ($('.two-item-carousel').length) {
		$('.two-item-carousel').owlCarousel({
			loop:true,
			margin:30,
			nav:true,
			smartSpeed: 500,
			autoplay: 1000,
			navText: [ '<span class="icon-5"></span>', '<span class="icon-6"></span>' ],
			responsive:{
				0:{
					items:1
				},
				480:{
					items:1
				},
				600:{
					items:1
				},
				800:{
					items:2
				},			
				1200:{
					items:2
				}

			}
		});    		
	}


    // three-item-carousel
	if ($('.three-item-carousel').length) {
		$('.three-item-carousel').owlCarousel({
			loop:true,
			margin:30,
			nav:true,
			smartSpeed: 500,
			autoplay: 1000,
			navText: [ '<span class="fal fa-angle-left"></span>', '<span class="fal fa-angle-right"></span>' ],
            items:3,
            autoWidth: false
		});    		
	}


	// four-item-carousel
	if ($('.four-item-carousel').length) {
		$('.four-item-carousel').owlCarousel({
			loop:true,
			margin:30,
			nav:true,
			smartSpeed: 500,
			autoplay: 1000,
			navText: [ '<span class="fal fa-angle-left"></span>', '<span class="fal fa-angle-right"></span>' ],
			responsive:{
				0:{
					items:1
				},
				480:{
					items:1
				},
				600:{
					items:2
				},
				800:{
					items:3
				},			
				1200:{
					items:4
				}

			}
		});    		
	}


	// five-item-carousel
	if ($('.five-item-carousel').length) {
		$('.five-item-carousel').owlCarousel({
			loop:true,
			margin:30,
			nav:true,
			smartSpeed: 500,
			autoplay: 1000,
			navText: [ '<span class="fal fa-angle-left"></span>', '<span class="fal fa-angle-right"></span>' ],
			responsive:{
				0:{
					items:1
				},
				480:{
					items:2
				},
				600:{
					items:3
				},
				800:{
					items:4
				},			
				1200:{
					items:5
				}

			}
		});    		
	}


	// four-item-carousel
	if ($('.project-carousel').length) {
		$('.project-carousel').owlCarousel({
			loop:true,
			margin:0,
			nav:true,
			smartSpeed: 500,
			autoplay: 1000,
			navText: [ '<span class="fal fa-angle-left"></span>', '<span class="fal fa-angle-right"></span>' ],
			responsive:{
				0:{
					items:1
				},
				480:{
					items:1
				},
				600:{
					items:2
				},
				800:{
					items:3
				},			
				1200:{
					items:4
				}

			}
		});    		
	}



	//Add One Page nav
	if($('.scroll-nav').length) {
		$('.scroll-nav').onePageNav();
	}

	//Sortable Masonary with Filters
	function enableMasonry() {
		if($('.sortable-masonry').length){
	
			var winDow = $(window);
			// Needed variables
			var $container=$('.sortable-masonry .items-container');
			var $filter=$('.filter-btns');
	
			$container.isotope({
				filter:'*',
				 masonry: {
					columnWidth : '.masonry-item.small-column'
				 },
				animationOptions:{
					duration:500,
					easing:'linear'
				}
			});
			
	
			// Isotope Filter 
			$filter.find('li').on('click', function(){
				var selector = $(this).attr('data-filter');
	
				try {
					$container.isotope({ 
						filter	: selector,
						animationOptions: {
							duration: 500,
							easing	: 'linear',
							queue	: false
						}
					});
				} catch(err) {
	
				}
				return false;
			});
	
	
			winDow.on('resize', function(){
				var selector = $filter.find('li.active').attr('data-filter');

				$container.isotope({ 
					filter	: selector,
					animationOptions: {
						duration: 500,
						easing	: 'linear',
						queue	: false
					}
				});
			});
	
	
			var filterItemA	= $('.filter-btns li');
	
			filterItemA.on('click', function(){
				var $this = $(this);
				if ( !$this.hasClass('active')) {
					filterItemA.removeClass('active');
					$this.addClass('active');
				}
			});
		}
	}
	
	enableMasonry();


    // Progress Bar
	if ($('.count-bar').length) {
		$('.count-bar').appear(function(){
			var el = $(this);
			var percent = el.data('percent');
			$(el).css('width',percent).addClass('counted');
		},{accY: -50});

	}


	// page direction
	function directionswitch() {
	  	if ($('.page_direction').length) {

	    	$('.direction_switch button').on('click', function() {
			   $('body').toggleClass(function(){
			      return $(this).is('.rtl, .ltr') ? 'rtl ltr' : 'rtl';
			  })
			});
	  	};
	}


	//Search Popup
	if($('#search-popup').length){
		
		//Show Popup
		$('.search-toggler').on('click', function() {
			$('#search-popup').addClass('popup-visible');
		});
		$(document).keydown(function(e){
	        if(e.keyCode === 27) {
	            $('#search-popup').removeClass('popup-visible');
	        }
	    });
		//Hide Popup
		$('.close-search,.search-popup .overlay-layer').on('click', function() {
			$('#search-popup').removeClass('popup-visible');
		});
	}


	//Price Range Slider
	if($('.price-range-slider').length){
		$( ".price-range-slider" ).slider({
			range: true,
			min: 10,
			max: 99,
			values: [ 10, 60 ],
			slide: function( event, ui ) {
			$( "input.property-amount" ).val( ui.values[ 0 ] + " - " + ui.values[ 1 ] );
			}
		});
		
		$( "input.property-amount" ).val( $( ".price-range-slider" ).slider( "values", 0 ) + " - $" + $( ".price-range-slider" ).slider( "values", 1 ) );	
	}


	//nice select
	$(document).ready(function() {
      $('select:not(.ignore)').niceSelect();
    });
    

    //Jquery Spinner / Quantity Spinner
	if($('.quantity-spinner').length){
		$("input.quantity-spinner").TouchSpin({
		  verticalbuttons: true
		});
	}


	// Scroll top button
    $('.scroll-top-inner').on("click", function () {
        $('html, body').animate({scrollTop: 0}, 500);
        return false;
    });


    function handleScrollbar() {
        const bHeight = $('body').height();
        const scrolled = $(window).innerHeight() + $(window).scrollTop();

        let percentage = ((scrolled / bHeight) * 100);

        if (percentage > 100) percentage = 100;

        $('.scroll-top-inner .bar-inner').css( 'width', percentage + '%');
    }

    

	/*	=========================================================================
	When document is Scrollig, do
	========================================================================== */

	jQuery(document).on('ready', function () {
		(function ($) {
			// add your functions
			directionswitch();
		})(jQuery);
	});



	/* ==========================================================================
   When document is Scrollig, do
   ========================================================================== */
	
	$(window).on('scroll', function() {
		headerStyle();
		handleScrollbar();
		if ($(window).scrollTop() > 200) {
                $('.scroll-top-inner').addClass('visible');
            } else {
                $('.scroll-top-inner').removeClass('visible');
            }
	});

	
	
	/* ==========================================================================
   When document is loaded, do
   ========================================================================== */
	
	$(window).on('load', function() {
		handlePreloader();
		enableMasonry();
		function equalizeFeatureHeight() {
		    if($('.feature-block-one .inner-box').length){
		        var maxHeight = 0;
		        $('.feature-block-one .inner-box').each(function(){
		            $(this).css('height', 'auto');
		            if($(this).height() > maxHeight){
		                maxHeight = $(this).height();
		            }
		        });
		        $('.feature-block-one .inner-box').height(maxHeight);
		    }
		}

		equalizeFeatureHeight();
		$(window).on('resize', function(){
		    equalizeFeatureHeight();
		});
	});

	



/* ── Active nav detection (2026-05) ──────────────────────────────────────── */
$(document).ready(function(){
  var page = (window.location.pathname.split('/').pop() || 'index.html')
               .replace(/[?#].*$/, '') || 'index.html';

  // Skip external URLs — their basename could collide with local pages
  function localBasename(href) {
    if (!href) return '';
    if (/^https?:\/\//i.test(href)) return '';
    return href.split('/').pop().replace(/[?#].*$/, '');
  }

  var $topItems = $('.main-menu .navigation > li');

  $topItems.each(function(){
    var $li = $(this);

    // 1. Check top-level anchor href
    var topHref = localBasename($li.children('a').attr('href') || '');
    if(topHref && topHref !== '#' && topHref === page){
      $li.addClass('current');
      return; // next li
    }

    // 2. Check all descendant links (mega-menu cards, dropdown items, etc.)
    var found = false;
    $li.find('a[href]').each(function(){
      var href = localBasename($(this).attr('href') || '');
      if(href && href === page){
        found = true;
        return false; // break .each
      }
    });
    if(found){ $li.addClass('current'); }
  });
});

})(window.jQuery);
