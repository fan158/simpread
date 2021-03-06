console.log( "=== simpread focus load ===" );

var storage  = require( "storage" ).storage,
    util     = require( "util" ),
    fcontrol = require( "controlbar" ),
    tooltip  = require( "tooltip" ),
    waves    = require( "waves" ),
    focus    = ( function () {

    var $parent,
        tag,
        focuscls   = "simpread-focus-highlight",
        focusstyle = "z-index: 2147483646; overflow: visible; position: relative;",
        maskcls    = "simpread-focus-mask",
        maskstyle  = "z-index: auto; opacity: 1; overflow: visible; transform: none; animation: none; position: relative;",
        bgcls      = "simpread-focus-root",
        bgtmpl     = "<div class=" + bgcls + "></div>",
        bgclsjq    = "." + bgcls;

    function Focus() { this.$target = null; }

    /**
     * Add focus mode
     * 
     * @param {jquery} jquery object
     * @param {array}  exclude html array
     * @param {string} background color style
     */
    Focus.prototype.Render = function( $target, exclude, bgcolor ) {
        console.log( "=== simpread focus add ===" );
        this.$target = $target;

        // set include style
        includeStyle( $target, focusstyle, focuscls, "add" );

        // set exclude style
        excludeStyle( $target, exclude, "delete" );

        // add simpread-focus-mask
        $parent = $target.parent();
        tag     = $parent[0].tagName;
        while ( tag.toLowerCase() != "body" ) {
            includeStyle( $parent, maskstyle, maskcls, "add" );
            $parent = $parent.parent();
            tag     = $parent[0].tagName;
        }

        // add background
        $( "body" ).append( bgtmpl );

        // add background color
        $( bgclsjq )
            .css({ "background-color" : bgcolor })
            .velocity({ opacity: 1 });

        // add control bar
        fcontrol.Render( bgclsjq );

        // add tooltip and waves
        tooltip.Render( bgclsjq );
        waves.Render({ root: bgclsjq });

        // click mask remove it
        $( bgclsjq ).on( "click", function( event, data ) {
            if ( ( event.target.tagName.toLowerCase() == "i" && event.target.id !="exit" ) ||
                $( event.currentTarget ).attr("class") != bgcls ||
                ( !storage.current.mask && !data )) return;
             $( bgclsjq ).velocity({ opacity: 0 }, {
                 complete: ()=> {
                    includeStyle( $target, focusstyle, focuscls, "delete" );
                    excludeStyle( $target, exclude, "add" );
                    tooltip.Exit( bgclsjq );
                    $( bgclsjq ).remove();
                    $( bgclsjq ).off( "click" );
                 }
             });

            // remove simpread-focus-mask style
            $parent = $target.parent();
            tag     = $parent[0].tagName;
            while ( tag && tag.toLowerCase() != "body" ) {
                includeStyle( $parent, maskstyle, maskcls, "delete" );
                $parent = $parent.parent();
                tag     = $parent[0].tagName;
            }

            console.log( "=== simpread focus remove ===" );
        });

    }

    /**
     * Get focus
     * 
     * @param {string} storage.current.site.include
     * @return {jquery} focus jquery object or undefined
     */
    Focus.prototype.GetFocus = function( include ) {
        var $focus = [],
            sel, range, node, tag,
            target;
        target = util.selector( include );
        try {
            if ( util.specTest( target ) ) {
                const [ value, state ] = util.specAction( include );
                if ( state == 0 ) {
                    include = include.replace( /\[\[{\$\(|}\]\]|\).html\(\)/g, "" );
                    $focus  = $( util.specAction( `[[[${include}]]]` )[0] );
                } else if ( state == 3 ) {
                    $focus  = value;
                }
            } else if ( target ) {
                $focus = $( "body" ).find( target );
            }
        } catch ( error ) {
            console.error( "Get $focus failed", error )
        }
        while ( $focus.length == 0 ) {
            if ( $( "body" ).find( "article" ).length > 0 ) {
                $focus = $( "body" ).find( "article" );
            }
            else {
                try {
                    sel    = window.getSelection();
                    range  = sel.getRangeAt( sel.rangeCount - 1 );
                    node   = range.startContainer.nodeName;
                if ( node.toLowerCase() === "body" ) throw( "selection area is body tag." );
                    $focus = $( range.startContainer.parentNode );
                } catch ( error ) {
                    console.log( sel, range, node )
                    console.error( error )
                    return undefined;
                }
            }
        }
        return fixFocus( $focus );
    }

    /**
     * Exist
     * 
     * @param  {boolean} when true, call fcontrol.Click()
     * @return {boolen} true: exist; false: not exist
     */
    Focus.prototype.Exist = function( action ) {
        if ( $( "body" ).find( "." + focuscls ).length > 0 ) {
            if (action) fcontrol.elem.onAction( undefined, "setting" );
            return true;
        } else {
            return false;
        }
    }

    /**
     * Exit
     */
    Focus.prototype.Exit = function() {
        $( bgclsjq ).trigger( "click", "okay" );
    }

    return new Focus();

})();

/**
 *  Set include style
 * 
 *  @param {jquery} jquery object
 *  @param {string} set style string
 *  @param {string} set class string
 *  @param {string} include 'add' and 'delete'
*/
function includeStyle( $target, style, cls, type ) {
    var bakstyle;
    if ( type === "add" ) {
        bakstyle = $target.attr( "style" ) == undefined ? "" : $target.attr( "style" );
        $target.attr( "style", bakstyle + style ).addClass( cls );
    } else if (  type === "delete" ) {
        bakstyle = $target.attr( "style" );
        bakstyle = bakstyle.replace( style, "" );
        $target.attr( "style", bakstyle ).removeClass( cls );
    }
}

/**
 * Set exclude style
 * 
 * @param {jquery} jquery object
 * @param {array}  hidden html
 * @param {string} include: 'add' 'delete'
 */
function excludeStyle( $target, exclude, type ) {
    const tags = util.exclude( $target, exclude );
    if ( type == "delete" )   $target.find( tags ).hide();
    else if ( type == "add" ) $target.find( tags ).show();
}

/**
 * Fix $focus get bad tag, get good tag and return
 * Good tag include: div, article
 * 
 * @param  {jquery} jquery object
 * @return {jquery} jquery object
 */
function fixFocus( $focus ) {
    var tag = $focus[0].tagName.toLowerCase();
    while ( [ "p", "span", "strong", "ul", "li", "code", "pre", "pre" ].includes( tag )) {
            $focus = $focus.parent();
            tag    = $focus[0].tagName.toLowerCase();
    }
    return $focus;
}

exports.focus       = focus;