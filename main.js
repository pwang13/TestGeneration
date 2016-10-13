var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		// args = ["subject.js"];
		args = ["mystery.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()

}

var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.funcName = properties.funcName;
	// Supported kinds: "fileWithContent","fileExists"
	// integer, string, phoneNumber
	this.kind = properties.kind;
}

function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
		}
	}
};

function generateTestCases()
{

	var content = "var subject = require('./mystery.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};

		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = '\'\'';
		}

		//console.log( params );

		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });


		// handle cases
		var trueP = _.some(constraints,{ident:'p'});
		var trueQ = _.some(constraints,{ident:'q'});
		var trueY = _.some(constraints,{ident:'y'});
		var buf= _.some(constraints,{ident:'buf'});
		var trueMode = _.some(constraints,{ident:'mode'});
		var options = _.some(constraints,{ident:'options'});
		var region= _.some(constraints,{ident:'phoneNumber'});
		var formatString=_.some(constraints,{ident:'formatString'});

		// if (trueY || trueMode) {
		// console.log("constraints: " + constraints);
		// 	var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		// console.log("params :" + params);
		// 	console.log(args);
		// 	// console.log("has: "+ functionName + "\n" + args);
		// }

		// if (trueQ) {
		// 	var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		// 	// console.log("another: "+ functionName + "\n" + args);
		// }

		// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) )
			{
				params[constraint.ident] = constraint.value;
				// console.log(constraint.ident + "value" + constraint.value);
			}
		}

		// Prepare function arguments.
		var args = Object.keys(params).map( function(k) {return params[k]; }).join(",");
		// console.log (args);
		// console.log(args);
		var boos = [true, false];
		// console.log(boos);
		if (trueQ || trueP) 
		{
			content += generateTestQP(trueP,trueQ,funcName,args);
			content += generateTestQP(!trueP,trueQ,funcName,args);
			content += generateTestQP(trueP,!trueQ,funcName,args);
			content += generateTestQP(!trueP,!trueQ,funcName,args);
		}

		if (trueY || trueMode) 
		{
			for ( boo in boos) {
				// console.log(boo);
				for (bo in boos) {
					for (b in boos) {
						for (var i = 0; i < 3; i++) {
							content += generateTestY(boo, bo, b, i, funcName, args);
						}
					}
				}
			}
		}
		if( pathExists || fileWithContent )
		{
			for ( boo in boos) {
				// console.log(boo);
				for (bo in boos) {
					for (b in boos) {
						for (a in boos) {
							content += generateMockFsTestCases(boo, bo, b, a, funcName, args);
						}
					}
				}
			}
		}

		if(options){
			content+=generateTestO(true,funcName,args);
			content+=generateTestO(false,funcName,args);
		}
		if(region){
			console.log("in region");
			content+=generateTestR(true,funcName,args);
			content+=generateTestR(false,funcName,args);
		}
		else
		{
			// Emit simple test case.
			content += "subject.{0}({1});\n".format(funcName, args );
		}
	}
	fs.writeFileSync('test.js', content, "utf8");
}

function generateTestO(options,funcName,args){
	var testCase="";
	var newArgs=args.split(',');
	
	var number="'"+faker.phone.phoneNumberFormat().toString()+"'";
	var numberFormat="'"+faker.phone.phoneFormats().toString()+"'";
	// console.log("number: "+ number);
	newArgs[0]=number;
	newArgs[1]=numberFormat;
	if(!options){
		newArgs[2]="false";
	}
	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	// console.log("testcase: "+ testCase);
	return testCase;
}

function generateTestR(region,funcName,args){
	console.log("in region");
	var testCase="";
	var newArgs=args.split(',');
	newArgs[0]=newArgs[0].substring(1,4);
	var number=faker.phone.phoneNumberFormat().toString();
	if(region){
		number=newArgs[0]+number.substring(3,12);
		// number = "919-123-4567"
		console.log("number: "+ number);
	}
	number="'"+number+"'";
	newArgs[0]=number;
	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	// console.log("phone: " +testCase);
	return testCase;
}

function generateTestY (x, y, z, mode, funcName, args) {
	console.log(args);
	// console.log(x + y + z + mode);
	// var newArgs = args.split(',');
	var testCase = "";
	var newArgs = args.split(',');
	if (x == 1) {
		// var number = newArgs[0] + ;
		var number = newArgs[0] + 1;
		newArgs[0] = number.toString();
	}

	if (x == 0) {
		var number = newArgs[0] - 1;
		newArgs[0] = number.toString();
	}

	if (y == 1) {
		var number = newArgs[1] + 1;
		newArgs[1] = number.toString();
	}

	if (y == 0) {
		var number = newArgs[1] - 1;
		newArgs[1] = number.toString();
	}

	if (z == 1) {
		var number = newArgs[2] - 1;
		newArgs[2] = number.toString();
	}

	if (z == 0) {
		var number = newArgs[2] + 1;
		newArgs[2] = number.toString();
	}

	if (mode == 1) {
		// var str = "'strictly'";
		var str = newArgs[3];
		newArgs[3] = str;
	}

	if (mode == 0) {
		var str = "'bob'";
		newArgs[3] = str;
	}

	if (mode == 2) {
		var str = "'lalla'";
		newArgs[3] = str;
	}

	if (z == 0 && mode == 0) {
		var str = "'stricter'";
		newArgs[3] = str;
	}
	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	// console.log(testCase);
	return testCase;
}

function generateTestQP (trueP,trueQ,funcName,args) 
{
	// console.log("args: " + args);
	var testCase = "";
	var newArgs = args.split(',');
	// console.log("new arges: " + newArgs);
	if (trueP) {
		var number = newArgs[0] - 1;
		// console.log("p :" + number);
		newArgs[0] = number.toString();
	}
	if (!trueP) {
		var number = newArgs[0] + 1;
		newArgs[0] = number.toString();
	}

	if (trueQ) {
		var number = newArgs[1] - 1;
		newArgs[1] = number.toString();
	}

	if (!trueQ) {
		var number = newArgs[1] + 1;
		newArgs[1] = number.toString();
	}
	// console.log("new arges: " + newArgs);

	testCase+="subject.{0}({1});\n".format(funcName, newArgs);
	// console.log(testCase);
	return testCase;
}


function generateMockFsTestCases (pathExists,fileWithContent, buf, len, funcName,args) 
{
	// console.log("pathExists: " + pathExists);
	var testCase = "";
	// Build mock file system based on constraints.
	var mergedFS = {};
	if( pathExists == 1 )
	{
		// console.log("in path\n");
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
			// console.log(mergedFS[attrname]);}
	}

	if( fileWithContent == 1)
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		mergedFS['path/fileExists'] = {'file1' : ''};

	}

	if( fileWithContent == 0 )
	{
		for (var attrname in mockFileLibrary.fileWithContent) {  mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
			mergedFS['path/fileExists'] = {'file1' : 'hello'};
			mergedFS['pathContent'] = {};
		// console.log("merge: " +mergedFS);
	}

	if( fileWithContent == 1 && buf == 0){
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		// mergedFS['path/fileExists']['file1']="hello";
		mergedFS['pathContent']['file1']="";
	}
	if( fileWithContent == 1 && buf == 1){
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		mergedFS['path/fileExists']['file1']="hello";
		mergedFS['pathContent']['file1']="hi";
	}

	if (len == 0) {
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
		mergedFS['path/fileExists'] = {};
		mergedFS['pathContent'] = {};
	}
	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tsubject.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			// console.log(node);
			var funcName = functionName(node);
			// console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});

			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression' && ((child.operator == "==" ) || (child.operator == "<") || (child.operator == ">") ) )
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						// console.log(params.indexOf( child.left.name ));
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])

						functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: child.left.name,
								value: rightHand,
								funcName: funcName,
								kind: "integer",
								operator : child.operator,
								expression: expression
							}));
						// console.log(functionConstraints[funcName].constraints);
					}
				}

				
				if( child.type === 'BinaryExpression' && child.operator == "!=")
				{
					if( child.left.type == 'Identifier' && child.left.name=="area")
					{
						// get expression from original source code:
						//var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push(
							{
								ident: 'phoneNumber',
								value: rightHand,
							}
						);
					}
				}

				if( child.type == "LogicalExpression" && child.operator=='||')
				{
					if(child.right.type=='UnaryExpression'){
						if(child.right.argument.type=='MemberExpression'){
							functionConstraints[funcName].constraints.push(
								{
									ident: child.right.argument.object.name,
									value: '{normalize: true}'
								}
							)
						}
					}
				}
				

				if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file1'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								// A fake path to a file
								value:  "'path/fileExists'",
								funcName: funcName,
								kind: "fileExists",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}

			});

			// console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
